import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "radar"))
import coletar  # noqa: E402

CFG = {"ufs_alvo": ["RS", "SC"], "valor_minimo": 300000, "dias_historico": 120,
       "max_consultas_cnpj": 10, "percentual_garantia": 0.05, "excluir_mei": True}
HOJE = date(2026, 11, 16)


def contrato(seq, cnpj, valor, categoria="Obras", **extra):
    base = {
        "numeroControlePNCP": f"00000000000100-2-{seq:06d}/2026",
        "tipoPessoa": "PJ", "niFornecedor": cnpj, "nomeRazaoSocialFornecedor": f"EMPRESA {seq} LTDA",
        "objetoContrato": "Pavimentação   de via urbana", "valorGlobal": valor, "receita": False,
        "dataAssinatura": "2026-11-12", "dataVigenciaInicio": "2026-11-12", "dataVigenciaFim": "2027-11-12",
        "dataPublicacaoPncp": "2026-11-13T10:00:00",
        "tipoContrato": {"id": 1, "nome": "Contrato (termo inicial)"},
        "categoriaProcesso": {"id": 7, "nome": categoria},
        "orgaoEntidade": {"cnpj": "00000000000100", "razaoSocial": "MUNICIPIO DE TESTE"},
        "unidadeOrgao": {"ufSigla": "RS", "municipioNome": "Porto Alegre"},
        "anoContrato": 2026, "sequencialContrato": seq,
    }
    base.update(extra)
    return base


EMPRESAS = {
    "11111111000111": {"uf": "RS", "municipio": "Caxias Do Sul", "porte": "DEMAIS", "situacao": "ATIVA", "mei": False},
    "22222222000122": {"uf": "SP", "municipio": "Sao Paulo", "porte": "DEMAIS", "situacao": "ATIVA", "mei": False},
    "33333333000133": {"uf": "SC", "municipio": "Joinville", "porte": "DEMAIS", "situacao": "BAIXADA", "mei": False},
}


class Radar(unittest.TestCase):
    def rodar(self, contratos, cache=None, pendentes=None, existentes=None, consultar=None, cfg=CFG):
        self.chamadas = []

        def padrao(cnpj):
            self.chamadas.append(cnpj)
            return EMPRESAS.get(cnpj)

        return coletar.processar(contratos, cfg, cache if cache is not None else {}, pendentes or [],
                                 existentes or [], HOJE, consultar=consultar or padrao, pausa=0)

    def test_filtra_por_uf_do_fornecedor(self):
        itens, pend, resumo = self.rodar([
            contrato(1, "11111111000111", 2_000_000),
            contrato(2, "22222222000122", 9_000_000),
        ])
        self.assertEqual([i["cnpj"] for i in itens], ["11111111000111"])
        self.assertEqual(itens[0]["garantia_estimada"], 100000.0)
        self.assertEqual(itens[0]["objeto"], "Pavimentação de via urbana")
        self.assertIn("Risco de engenharia", itens[0]["produtos"])
        self.assertEqual(itens[0]["link"], "https://pncp.gov.br/app/contratos/00000000000100/2026/1")
        self.assertEqual(resumo["novos"], 1)

    def test_descarta_pf_receita_e_valor_baixo_sem_consultar(self):
        itens, _, _ = self.rodar([
            contrato(1, "11111111000111", 100_000),
            contrato(2, "09228833785", 900_000, tipoPessoa="PF"),
            contrato(3, "11111111000111", 900_000, receita=True),
        ])
        self.assertEqual(itens, [])
        self.assertEqual(self.chamadas, [])

    def test_empresa_inativa_fica_de_fora(self):
        itens, _, _ = self.rodar([contrato(1, "33333333000133", 900_000)])
        self.assertEqual(itens, [])

    def test_cache_evita_nova_consulta(self):
        cache = {}
        dados = [contrato(1, "11111111000111", 900_000), contrato(2, "22222222000122", 900_000)]
        self.rodar(dados, cache=cache)
        self.assertEqual(cache["22222222000122"], {"uf": "SP"})
        self.rodar(dados, cache=cache)
        self.assertEqual(self.chamadas, [])

    def test_falha_na_consulta_vira_pendente_e_e_retomada(self):
        c = contrato(1, "11111111000111", 900_000)
        itens, pend, _ = self.rodar([c], consultar=lambda cnpj: None)
        self.assertEqual(itens, [])
        self.assertEqual(len(pend), 1)
        itens, pend, _ = self.rodar([], pendentes=pend)
        self.assertEqual(len(itens), 1)
        self.assertEqual(pend, [])

    def test_limite_de_consultas_prioriza_maior_valor(self):
        cfg = dict(CFG, max_consultas_cnpj=1)
        itens, pend, _ = self.rodar([
            contrato(1, "22222222000122", 400_000),
            contrato(2, "11111111000111", 8_000_000),
        ], cfg=cfg)
        self.assertEqual(self.chamadas, ["11111111000111"])
        self.assertEqual(len(itens), 1)
        self.assertEqual(len(pend), 1)

    def test_historico_nao_duplica_e_expira(self):
        primeiro, _, _ = self.rodar([contrato(1, "11111111000111", 900_000)])
        velho = dict(primeiro[0], id="antigo", publicacao="2026-01-01")
        itens, _, resumo = self.rodar([contrato(1, "11111111000111", 900_000)], existentes=primeiro + [velho])
        self.assertEqual(len(itens), 1)
        self.assertEqual(resumo["novos"], 0)

    def test_pontuacao(self):
        obra = coletar.pontuar(contrato(1, "x", 12_000_000), HOJE)
        compra = coletar.pontuar(contrato(1, "x", 350_000, categoria="Compras",
                                          tipoContrato={"id": 7, "nome": "Empenho"},
                                          dataVigenciaFim="2026-12-31"), HOJE)
        self.assertEqual(obra, 100)
        self.assertEqual(compra, 34)

    def test_paginacao(self):
        paginas = {1: {"data": [{"a": 1}], "paginasRestantes": 1}, 2: {"data": [{"a": 2}], "paginasRestantes": 0}}
        urls = []

        def falso(url):
            urls.append(url)
            if "tamanhoPagina=500" in url:
                return 400, None
            return 200, paginas[int(url.split("pagina=")[1].split("&")[0])]

        self.assertEqual(coletar.buscar_contratos(date(2026, 11, 13), HOJE, baixar=falso), [{"a": 1}, {"a": 2}])
        self.assertIn("dataInicial=20261113", urls[0])

    def test_telefone(self):
        self.assertEqual(coletar.formatar_telefone("5432211000"), "(54) 3221-1000")
        self.assertEqual(coletar.formatar_telefone(""), "")


if __name__ == "__main__":
    unittest.main()
