#!/usr/bin/env python3
"""RADAR-360: contratos públicos recém-publicados no PNCP cujo fornecedor tem sede em RS/SC.

Uso:
    python radar/coletar.py            # busca os últimos dias definidos em config.json
    python radar/coletar.py --dias 30  # carga inicial maior

Só usa a biblioteca padrão do Python.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ARQ_CONFIG = RAIZ / "config.json"
ARQ_CACHE = RAIZ / "data" / "cnpj_cache.json"
ARQ_PENDENTES = RAIZ / "data" / "pendentes.json"
ARQ_JSON = RAIZ / "docs" / "data" / "oportunidades.json"
ARQ_CSV = RAIZ / "docs" / "data" / "oportunidades.csv"

PNCP_CONTRATOS = "https://pncp.gov.br/api/consulta/v1/contratos"
FONTES_CNPJ = [
    "https://brasilapi.com.br/api/cnpj/v1/{cnpj}",
    "https://minhareceita.org/{cnpj}",
]
AGENTE = "radar-360/1.0"


# ---------------------------------------------------------------- rede

def baixar_json(url: str, tentativas: int = 4, espera: float = 3.0):
    """GET com novas tentativas. Devolve (status, json | None)."""
    ultimo = 0
    for i in range(tentativas):
        req = urllib.request.Request(url, headers={"User-Agent": AGENTE, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                corpo = resp.read()
                if resp.status == 204 or not corpo:
                    return 204, None
                return resp.status, json.loads(corpo)
        except urllib.error.HTTPError as e:
            ultimo = e.code
            if e.code in (400, 404, 422):
                return e.code, None
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ConnectionError):
            ultimo = 0
        time.sleep(espera * (i + 1))
    return ultimo, None


def buscar_contratos(inicio: date, fim: date, baixar=baixar_json) -> list[dict]:
    """Todos os contratos publicados no PNCP entre as duas datas."""
    registros: list[dict] = []
    tamanho = 500
    pagina = 1
    while True:
        params = urllib.parse.urlencode({
            "dataInicial": inicio.strftime("%Y%m%d"),
            "dataFinal": fim.strftime("%Y%m%d"),
            "pagina": pagina,
            "tamanhoPagina": tamanho,
        })
        status, dados = baixar(f"{PNCP_CONTRATOS}?{params}")
        if status == 400 and tamanho > 100 and pagina == 1:
            tamanho = 100  # a API recusou o tamanho de página; tenta menor
            continue
        if status == 204:
            break
        if dados is None:
            raise RuntimeError(f"PNCP não respondeu (status {status}) na página {pagina}")
        registros.extend(dados.get("data") or [])
        if not dados.get("paginasRestantes"):
            break
        pagina += 1
        time.sleep(0.3)
    return registros


def consultar_cnpj(cnpj: str, baixar=baixar_json) -> dict | None:
    """Dados cadastrais do fornecedor. None = não foi possível consultar agora."""
    for modelo in FONTES_CNPJ:
        status, d = baixar(modelo.format(cnpj=cnpj), tentativas=2, espera=2.0)
        if d and d.get("uf"):
            return {
                "uf": d.get("uf"),
                "municipio": (d.get("municipio") or "").title(),
                "porte": d.get("porte") or "",
                "cnae": d.get("cnae_fiscal_descricao") or "",
                "telefone": formatar_telefone(d.get("ddd_telefone_1")),
                "situacao": d.get("descricao_situacao_cadastral") or "",
                "mei": bool(d.get("opcao_pelo_mei")),
                "fantasia": (d.get("nome_fantasia") or "").title(),
            }
        if status == 404:
            return {"uf": "??"}
    return None


def formatar_telefone(bruto) -> str:
    n = "".join(c for c in str(bruto or "") if c.isdigit())
    if len(n) < 10:
        return ""
    return f"({n[:2]}) {n[2:-4]}-{n[-4:]}"


# ---------------------------------------------------------------- regras de negócio

def candidato(c: dict, cfg: dict) -> bool:
    """Filtro barato, antes de gastar consulta de CNPJ."""
    if c.get("tipoPessoa") != "PJ" or c.get("receita"):
        return False
    cnpj = c.get("niFornecedor") or ""
    if len(cnpj) != 14 or not cnpj.isdigit():
        return False
    return (c.get("valorGlobal") or 0) >= cfg["valor_minimo"]


def _data(txt) -> date | None:
    try:
        return date.fromisoformat((txt or "")[:10])
    except ValueError:
        return None


def pontuar(c: dict, hoje: date) -> int:
    valor = c.get("valorGlobal") or 0
    categoria = ((c.get("categoriaProcesso") or {}).get("nome") or "").lower()
    tipo = ((c.get("tipoContrato") or {}).get("nome") or "").lower()

    if valor >= 10_000_000:
        p = 40
    elif valor >= 5_000_000:
        p = 34
    elif valor >= 1_000_000:
        p = 26
    elif valor >= 500_000:
        p = 18
    else:
        p = 10

    if "obra" in categoria or "engenharia" in categoria:
        p += 30
    elif "mão de obra" in categoria or "mao de obra" in categoria:
        p += 24
    elif "serviço" in categoria or "informática" in categoria:
        p += 16
    elif "compra" in categoria:
        p += 10
    else:
        p += 5

    assinatura = _data(c.get("dataAssinatura"))
    dias = (hoje - assinatura).days if assinatura else 999
    p += 20 if dias <= 7 else 14 if dias <= 15 else 8 if dias <= 30 else 3

    ini, fim = _data(c.get("dataVigenciaInicio")), _data(c.get("dataVigenciaFim"))
    p += 10 if ini and fim and (fim - ini).days >= 330 else 4

    if "empenho" in tipo:
        p -= 10
    return max(0, min(100, p))


def produtos(c: dict) -> list[str]:
    categoria = ((c.get("categoriaProcesso") or {}).get("nome") or "").lower()
    lista = ["Seguro garantia (executante)"]
    if "obra" in categoria or "engenharia" in categoria:
        lista += ["Risco de engenharia", "RC obras"]
    elif "mão de obra" in categoria or "mao de obra" in categoria:
        lista += ["Garantia com cobertura trabalhista", "Vida em grupo", "RC geral"]
    elif "informática" in categoria:
        lista += ["RC profissional (E&O)", "Cyber"]
    elif "saúde" in categoria:
        lista += ["RC profissional", "RC geral"]
    elif "compra" in categoria:
        lista += ["Transporte", "RC produtos"]
    else:
        lista += ["RC geral"]
    return lista


def montar(c: dict, emp: dict, cfg: dict, hoje: date) -> dict:
    orgao = c.get("orgaoEntidade") or {}
    unidade = c.get("unidadeOrgao") or {}
    valor = float(c.get("valorGlobal") or 0)
    score = pontuar(c, hoje)
    return {
        "id": c.get("numeroControlePNCP"),
        "score": score,
        "prioridade": "A" if score >= 70 else "B" if score >= 50 else "C",
        "fornecedor": c.get("nomeRazaoSocialFornecedor") or "",
        "fantasia": emp.get("fantasia", ""),
        "cnpj": c.get("niFornecedor"),
        "uf": emp.get("uf"),
        "municipio": emp.get("municipio", ""),
        "porte": emp.get("porte", ""),
        "atividade": emp.get("cnae", ""),
        "telefone": emp.get("telefone", ""),
        "valor": valor,
        "garantia_estimada": round(valor * cfg["percentual_garantia"], 2),
        "objeto": " ".join((c.get("objetoContrato") or "").split())[:400],
        "categoria": (c.get("categoriaProcesso") or {}).get("nome") or "",
        "tipo": (c.get("tipoContrato") or {}).get("nome") or "",
        "orgao": orgao.get("razaoSocial") or "",
        "orgao_uf": unidade.get("ufSigla") or "",
        "orgao_municipio": unidade.get("municipioNome") or "",
        "assinatura": (c.get("dataAssinatura") or "")[:10],
        "vigencia_inicio": (c.get("dataVigenciaInicio") or "")[:10],
        "vigencia_fim": (c.get("dataVigenciaFim") or "")[:10],
        "publicacao": (c.get("dataPublicacaoPncp") or "")[:10],
        "produtos": produtos(c),
        "link": "https://pncp.gov.br/app/contratos/{}/{}/{}".format(
            orgao.get("cnpj"), c.get("anoContrato"), c.get("sequencialContrato")),
    }


# ---------------------------------------------------------------- arquivos

def ler(arq: Path, padrao):
    try:
        return json.loads(arq.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return padrao


def gravar(arq: Path, dados) -> None:
    arq.parent.mkdir(parents=True, exist_ok=True)
    arq.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def gravar_csv(itens: list[dict]) -> None:
    colunas = ["prioridade", "score", "fornecedor", "cnpj", "uf", "municipio", "porte", "telefone",
               "valor", "garantia_estimada", "categoria", "objeto", "orgao", "orgao_uf",
               "assinatura", "vigencia_fim", "produtos", "link"]
    ARQ_CSV.parent.mkdir(parents=True, exist_ok=True)
    with ARQ_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(colunas)
        for i in itens:
            linha = []
            for col in colunas:
                v = i.get(col, "")
                if col == "produtos":
                    v = " | ".join(v)
                elif col in ("valor", "garantia_estimada"):
                    v = f"{v:.2f}".replace(".", ",")
                linha.append(v)
            w.writerow(linha)


# ---------------------------------------------------------------- fluxo principal

def processar(contratos: list[dict], cfg: dict, cache: dict, pendentes: list[dict],
              existentes: list[dict], hoje: date, consultar=consultar_cnpj, pausa: float = 0.4):
    """Devolve (oportunidades, pendentes, resumo). Função pura quanto a arquivos."""
    alvo = set(cfg["ufs_alvo"])
    por_id = {i["id"]: i for i in existentes}

    fila = {c["numeroControlePNCP"]: c for c in pendentes if c.get("numeroControlePNCP")}
    for c in contratos:
        if c.get("numeroControlePNCP") and candidato(c, cfg):
            fila[c["numeroControlePNCP"]] = c
    ordenados = sorted(fila.values(), key=lambda c: -(c.get("valorGlobal") or 0))

    consultas = 0
    novos = 0
    novos_pendentes: list[dict] = []
    for c in ordenados:
        cnpj = c["niFornecedor"]
        emp = cache.get(cnpj)
        if emp is None:
            if consultas >= cfg["max_consultas_cnpj"]:
                novos_pendentes.append(c)
                continue
            consultas += 1
            emp = consultar(cnpj)
            time.sleep(pausa)
            if emp is None:
                novos_pendentes.append(c)
                continue
            # fora da região-alvo: guarda só a UF para não consultar de novo
            cache[cnpj] = emp if emp.get("uf") in alvo else {"uf": emp.get("uf")}
        if emp.get("uf") not in alvo:
            continue
        if cfg.get("excluir_mei") and emp.get("mei"):
            continue
        if emp.get("situacao") and emp["situacao"].upper() != "ATIVA":
            continue
        if c["numeroControlePNCP"] not in por_id:
            novos += 1
        por_id[c["numeroControlePNCP"]] = montar(c, emp, cfg, hoje)

    corte = (hoje - timedelta(days=cfg["dias_historico"])).isoformat()
    itens = [i for i in por_id.values() if (i.get("publicacao") or "9999") >= corte]
    itens.sort(key=lambda i: (-i["score"], -i["valor"]))
    resumo = {"lidos": len(contratos), "candidatos": len(ordenados), "consultas_cnpj": consultas,
              "novos": novos, "pendentes": len(novos_pendentes), "total": len(itens)}
    return itens, novos_pendentes, resumo


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dias", type=int, help="quantos dias para trás buscar (padrão: config.json)")
    args = ap.parse_args()

    cfg = ler(ARQ_CONFIG, {})
    hoje = date.today()
    dias = args.dias or cfg["dias_busca"]
    inicio = hoje - timedelta(days=dias)

    print(f"Buscando contratos publicados de {inicio} a {hoje}...")
    contratos = buscar_contratos(inicio, hoje)

    cache = ler(ARQ_CACHE, {})
    pendentes = ler(ARQ_PENDENTES, [])
    existentes = (ler(ARQ_JSON, {}) or {}).get("oportunidades", [])

    itens, pendentes, resumo = processar(contratos, cfg, cache, pendentes, existentes, hoje)

    gravar(ARQ_CACHE, cache)
    gravar(ARQ_PENDENTES, pendentes)
    gravar(ARQ_JSON, {
        "atualizado_em": datetime.now().astimezone().isoformat(timespec="minutes"),
        "ufs_alvo": cfg["ufs_alvo"],
        "valor_minimo": cfg["valor_minimo"],
        "resumo": resumo,
        "oportunidades": itens,
    })
    gravar_csv(itens)
    print("Resumo:", json.dumps(resumo, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
