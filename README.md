# RADAR-360

Radar diário de empresas com sede em **RS e SC** que assinaram contratos públicos, para prospecção de seguro garantia e ramos correlatos.

## Como funciona

1. Todo dia, às 06:17, o GitHub Actions lê os contratos publicados no [PNCP](https://pncp.gov.br).
2. Descarta pessoa física, contratos de receita e valores abaixo do mínimo.
3. Consulta o CNPJ do fornecedor e mantém só os com sede em RS/SC, ativos e que não são MEI.
4. Pontua cada contrato (valor, categoria, data de assinatura, vigência) e sugere os ramos.
5. Publica o resultado em `docs/` (painel) e `docs/data/oportunidades.csv` (planilha).

## Ativação (uma vez)

1. Fazer o merge deste código na branch `main` — o agendamento só roda na branch principal.
2. **Settings → Pages → Source: Deploy from a branch → `main` / `/docs`**.
3. **Actions → Radar de licitações → Run workflow**, com `dias = 30` para a carga inicial.

O painel fica em `https://konzengestaors-arch.github.io/RADAR-360/`.

## Ajustes

Em `config.json`:

| Campo | O que faz |
|---|---|
| `ufs_alvo` | UFs da sede do fornecedor |
| `valor_minimo` | Valor mínimo do contrato (R$) |
| `dias_busca` | Janela da busca diária |
| `dias_historico` | Por quantos dias um contrato fica no painel |
| `max_consultas_cnpj` | Limite de consultas de CNPJ por execução; o excedente fica para a próxima |
| `percentual_garantia` | Percentual usado na estimativa da garantia |

## Rodar manualmente

```bash
python radar/coletar.py --dias 7
python -m unittest discover -s tests
```

Só usa a biblioteca padrão do Python 3.10+.

## Limitações

- O contrato é publicado depois da assinatura; a garantia daquele contrato pode já ter sido emitida. O radar identifica **empresas que compram garantia de forma recorrente**, não o momento exato da emissão.
- A garantia estimada (5%) é referência; o percentual real está no edital.
- O repositório e o painel são públicos.
