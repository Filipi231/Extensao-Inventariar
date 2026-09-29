# Extensão Inventariar

Automação que desenvolvi para auxiliar o processo de inventário no sistema **IBM**.

## Contexto

No inventário, as contagens feitas no almoxarifado precisam ser lançadas no sistema, item por item. Durante esse lançamento, conferir se cada contagem bate com o saldo exige atenção linha a linha, o que torna o processo lento e sujeito a erros.

## O que a extensão faz

A extensão funciona direto na tela de ajuste de inventário do sistema e compara, em tempo real, o valor digitado em **Nova Contagem** com o **Saldo Atual** de cada item:

- 🟩 **verde** — a contagem bate com o saldo;
- 🟥 **vermelho** — existe divergência entre a contagem e o saldo.

O destaque é atualizado enquanto o valor é digitado e pode ser ligado ou desligado a qualquer momento.

Na versão mais recente, a extensão também **preenche os campos de contagem automaticamente**, reduzindo o trabalho manual de digitação.

## Como ajuda

- Divergências identificadas na hora, visualmente, sem conferir linha por linha
- Menos erros no lançamento do inventário
- Lançamento mais rápido, com o preenchimento automático dos campos
- Mais segurança para quem está ajustando o saldo no sistema

## Tecnologias

JavaScript · Extensão para Chrome/Edge (Manifest V3) · SheetJS

> Os endereços do ambiente da empresa foram substituídos por valores genéricos neste repositório.

---

Desenvolvido por [Filipi Barbosa](https://github.com/Filipi231).
