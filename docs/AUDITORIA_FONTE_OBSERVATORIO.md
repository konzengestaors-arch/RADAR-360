# Auditoria preliminar — HTML RADAR Observatório v1.9

## Proveniência
Arquivo localizado na biblioteca: `RADAR_OBSERVATORIO_v1.9_INDEX.html`
SHA-256 (cópia analisada): `510e0ba84e5f9290fd3279c24e2cb3f2586a2bf578313a02ba3b0231897ff25f`
Arquivo **não incluído** neste repositório público.

## Resultados da inspeção estática
- Título da página: `RADAR Observatório | v1.9 notícias sob demanda`.
- O seed interno declara `schema: radar-observatorio-unico/1.7` e `release: 1.7-candidata-local`; exige reconciliação entre versão de interface, formato de dados e versão de aplicação.
- Seed incorpora **10 movimentos** e **8 indicadores**, além de fontes e histórico. Essas informações não foram copiadas para o GitHub.
- Detectado uso de `localStorage`; persistência, migração e restauração não estão homologadas em dispositivo real.
- Detectadas consultas `fetch` a endpoint próprio `/api/noticias` e à API pública Frankfurter.
- Detectado script de widget externo TradingView. A presença de script externo requer revisão de segurança e privacidade antes de publicar.
- Não foram identificadas referências textuais à palavra `Marsh` no arquivo analisado. Isso **não comprova** ausência de informação proprietária.

## Riscos e prioridade
- **P0**: ausência de comprovação de integridade e recuperação de dados locais.
- **P0**: ausência de comprovação de isolamento entre dados comerciais, observação regional e dados de usuários.
- **P1**: divergência de versão e esquema de dados.
- **P1**: dependência de recursos externos e controle de falhas de rede.

## Próximo portão
Preparar versão de demonstração sem seed documental ou dados pessoais, preservar cópia íntegra local, revisar comportamento de inicialização com seed vazio e executar testes de navegação, persistência e recuperação. Não publicar a origem no GitHub sem triagem adicional.
