DESENVOLVIMENTO DE UMA PLATAFORMA DE VIABILIZAÇÃO COLETIVA PARA EVENTOS CULTURAIS LOCAIS.

MEIRA, Jessica Leandro de
FERRARI, Allan Christian Krainski

Resumo

Este trabalho apresenta o desenvolvimento de um protótipo de plataforma de viabilização coletiva para eventos culturais locais, em que a confirmação do evento e a captura dos pagamentos são condicionadas ao alcance de um quórum mínimo de interessados, segundo o modelo all-or-nothing de crowdfunding. Investigam-se quatro problemas de engenharia de software: controle de concorrência para evitar sobrevenda; controle de vazão via Token Bucket; otimização de consultas de proximidade com PostGIS e índices GiST; e integridade transacional do fluxo de pagamentos via abstração de gateway com idempotência. De natureza aplicada e experimental, a pesquisa resultou em um protótipo avaliado por testes automatizados de concorrência e experimentos de carga com k6 e EXPLAIN ANALYZE. Os resultados mostram que a atualização atômica condicional elimina sobrevenda sob 1.000 requisições simultâneas, que o Token Bucket reduz a latência média e aumenta o throughput, e que o índice GiST reduz em cerca de três vezes o tempo de consultas espaciais, com crescimento sub-linear em relação ao volume de dados. Conclui-se que a combinação dessas técnicas viabiliza tecnicamente um modelo que reduz o risco financeiro de produtores culturais independentes.

Palavras-chave: Crowdfunding. Controle de concorrência. Token Bucket. PostGIS. Integridade transacional.


Abstract

This work presents the development of a prototype platform for the collective viability assessment of local cultural events, in which event confirmation and payment capture are conditioned on reaching a minimum quorum of interested users, following the all-or-nothing crowdfunding model. Four software engineering problems are investigated: concurrency control to prevent overselling; request rate limiting via the Token Bucket algorithm; optimization of proximity queries with PostGIS and GiST indexes; and transactional integrity of the payment flow through a gateway abstraction with idempotency guarantees. Of an applied, experimental nature, the research resulted in a prototype evaluated through automated concurrency tests and load experiments using k6 and EXPLAIN ANALYZE. Results show that the conditional atomic update eliminates overselling under 1,000 concurrent requests, that the Token Bucket reduces average latency and increases throughput, and that the GiST index reduces spatial query time by roughly three times, with sub-linear growth relative to data volume. It is concluded that combining these techniques technically enables a business model that reduces financial risk for independent cultural producers.

Keywords: Crowdfunding. Concurrency control. Token Bucket. PostGIS. Transactional integrity.


INTRODUÇÃO

O cenário cultural independente enfrenta desafios de produção, divulgação e viabilização de eventos frente a iniciativas de maior porte, com mais exposição na mídia (OLIVEIRA, 2018). Eventos de pequeno e médio porte dependem, com frequência, do "boca a boca" e permanecem à margem dos meios tradicionais, ainda que o setor também atraia investimento de grandes grupos corporativos (JÚNIOR, 2017).

Nesse contexto, mecanismos de financiamento coletivo surgem como alternativa para viabilizar projetos culturais: Valiati e Tietzmann (2012) descrevem o crowdfunding como a contribuição de diversas pessoas até que uma iniciativa alcance os recursos necessários, sendo os valores devolvidos caso a meta não seja atingida no prazo.

Este trabalho aplica essa lógica a eventos culturais locais: em vez de tratar a venda de ingressos como operação posterior à definição do evento, propõe-se condicionar sua confirmação ao alcance de um quórum mínimo de interessados, reduzindo a exposição financeira do produtor e facilitando a descoberta de eventos próximos ao público, o que também exige atenção à localização na geração de recomendações relevantes (PEREIRA, 2016).

Diante desse panorama, define-se a seguinte pergunta de pesquisa: de que maneira uma plataforma de viabilização coletiva, fundamentada em uma arquitetura de alta integridade transacional e controle de concorrência, pode mitigar os riscos financeiros e promover o fomento à cultura local?

O objetivo geral deste trabalho é desenvolver uma plataforma de viabilização coletiva para eventos culturais locais, baseada no modelo de quórum mínimo, no qual a confirmação do evento e a efetivação dos pagamentos dependem do alcance de um número pré-determinado de interessados. Os objetivos específicos são: (i) implementar o algoritmo Token Bucket para controle de vazão; (ii) assegurar consistência de dados e prevenir sobrevenda em cenários de alta concorrência, por meio de filas e atualizações atômicas; (iii) otimizar consultas de vizinhança para recomendação de eventos e artistas locais com PostGIS e índices GiST; e (iv) garantir a integridade transacional do sistema por meio de integração segura com gateways de pagamento.

A escolha dessas soluções está associada aos desafios da plataforma: Carvalho (2023) analisa o Token Bucket como mecanismo de controle de tráfego, cujos princípios se aplicam ao controle de requisições de um sistema web; e Sonáglio (2007) e Rodrigues (2018) evidenciam a importância da indexação de dados espaciais no PostGIS para o desempenho de consultas de vizinhança em recomendação de eventos e artistas locais.

A justificativa deste projeto está em aliar o fomento à cultura regional aos desafios técnicos de uma plataforma segura e consistente, permitindo que produtores independentes avaliem previamente o interesse do público e reduzam riscos.

O trabalho está estruturado em cinco seções: esta introdução; a fundamentação teórica; a metodologia; os resultados; e as considerações finais.


FUNDAMENTAÇÃO TEÓRICA

Este capítulo apresenta os conceitos teóricos que fundamentam este trabalho: crowdfunding, controle de vazão por Token Bucket, indexação espacial com PostGIS/GiST e integridade transacional em pagamentos.

CROWDFUNDING

Crowdfunding, ou financiamento coletivo, é o mecanismo pelo qual um empreendedor, artista ou organização capta recursos de um grande número de pessoas, tipicamente por meio de uma plataforma on-line, em substituição a intermediários financeiros tradicionais (MOLLICK, 2014). O processo consiste na divulgação de uma meta e de um prazo, aos quais os apoiadores comprometem recursos, compromisso condicionado ao sucesso coletivo da campanha.

Um modelo central para este trabalho é o all-or-nothing: o valor só é cobrado se a meta mínima for atingida no prazo; caso contrário, a campanha é cancelada e ninguém é cobrado (MOLLICK, 2014). Esse modelo resolve um problema de coordenação típico de bens com custo fixo elevado e retorno dependente de escala mínima de participantes — o caso de um evento cultural, cujo produtor só o viabiliza a partir de um número mínimo de público pagante. Já o civic crowdfunding descreve campanhas voltadas a bens de interesse coletivo local, em que o financiamento funciona também como validação de demanda: o projeto só se concretiza se houver interesse real e suficiente da comunidade (DAVIES, 2014).

TOKEN BUCKET

Token Bucket é um algoritmo de controle de vazão (rate limiting), usado em redes de computadores e em software para limitar a taxa de consumo de um recurso, absorvendo picos de curta duração sem descartar todo o excedente de imediato (TANENBAUM; WETHERALL, 2011; CARVALHO, 2023). O algoritmo é descrito por um "balde" com capacidade máxima de C tokens, reabastecido a uma taxa constante r por unidade de tempo; cada requisição consome um token para ser aceita e é rejeitada quando o balde está vazio:

tokens(t) = min( C, tokens₀ + r × (t − t₀) )

O Token Bucket permite rajadas de até C requisições quando o balde está cheio, mantendo uma taxa média sustentável no longo prazo — combinação que o distingue de algoritmos mais rígidos, como o leaky bucket (TANENBAUM; WETHERALL, 2011). Em sistemas concorrentes, a dificuldade está em garantir que leitura, cálculo do reabastecimento e decremento ocorram como uma única operação atômica, sem a qual duas requisições simultâneas podem ler o mesmo saldo e ambas serem aceitas quando apenas uma deveria.

POSTGIS E ÍNDICES GIST

PostGIS é uma extensão do PostgreSQL que adiciona suporte a objetos geográficos e geométricos, permitindo armazenar, indexar e consultar dados espaciais diretamente em SQL, com funções de distância, contenção, interseção e proximidade (OBE; HSU, 2015; SONÁGLIO, 2007; RODRIGUES, 2018). Distinguem-se dois tipos de coluna espacial: geometry, que trata as coordenadas em um plano cartesiano, e geography, que as trata sobre a superfície de um esferoide, tornando o cálculo de distância em metros direto, a um custo computacional maior por operação.

Consultas de proximidade têm, em uma tabela sem suporte especializado, custo linear no número de linhas. Para torná-las eficientes, o PostgreSQL oferece o GiST (Generalized Search Tree), estrutura de índice genérica e extensível proposta por Hellerstein, Naughton e Pfeffer (1995), capaz de indexar dados multidimensionais — ao contrário do B-tree, adequado só a dados linearmente ordenáveis. O PostGIS usa o GiST para indexar colunas espaciais por retângulos envolventes mínimos organizados hierarquicamente: o índice descarta regiões do espaço que não podem conter resultados, sem examinar cada linha individualmente (HELLERSTEIN; NAUGHTON; PFEFFER, 1995; SONÁGLIO, 2007).

GATEWAYS DE PAGAMENTO E INTEGRIDADE TRANSACIONAL

Um gateway de pagamento é um serviço intermediário que processa transações financeiras em nome de uma aplicação, devolvendo apenas o resultado da transação, sem que esta manipule dados sensíveis de pagamento. A comunicação costuma ser assíncrona: a aplicação cria uma cobrança, inicialmente pendente, e o resultado definitivo chega depois por um webhook — notificação HTTP enviada pelo gateway de volta à aplicação.

Esse desacoplamento introduz um problema clássico de sistemas distribuídos: garantias de entrega at-least-once. Como o gateway não tem certeza de que sua notificação chegou, o padrão de mercado é reenviá-la até obter confirmação, o que implica que o mesmo evento pode ser recebido mais de uma vez. A resposta correta não é garantir entrega exatamente uma vez — o que exigiria coordenação distribuída onerosa —, mas tornar o processamento idempotente: reprocessar o mesmo evento deve produzir sempre o mesmo resultado final (KLEPPMANN, 2017). Essa integridade depende também das propriedades ACID (Atomicity, Consistency, Isolation, Durability) das transações do banco relacional subjacente (GRAY; REUTER, 1993): a atomicidade garante que uma operação financeira seja aplicada por completo ou não seja aplicada, nunca parcialmente.


METODOLOGIA

Tipo de pesquisa

Este trabalho tem natureza de pesquisa aplicada, de caráter tecnológico e experimental: aplica conceitos consolidados na literatura à construção de um protótipo funcional e avalia experimentalmente o efeito dessas decisões sobre o sistema sob carga, aproximando-se do Design Science Research (HEVNER et al., 2004).

Ambiente e ferramentas

O protótipo foi desenvolvido como um monólito modular, dividido por domínio (auth, users, artists, events, interests, payments, tickets, recommendations, rate-limit, queues), evitando microsserviços. A stack é composta por: back-end em NestJS/TypeScript (API REST); front-end em React/TypeScript/Vite; PostgreSQL com PostGIS e migrations via TypeORM; Redis e BullMQ; uma abstração própria de gateway de pagamento, com adapter simulado em sandbox; Docker Compose; e Jest e k6 para os testes. O código-fonte está disponível em: https://github.com/jessicameira/TCC-crowdfunding.

Etapas de desenvolvimento

O desenvolvimento seguiu oito fases incrementais: fundação (Docker, PostgreSQL/PostGIS, Redis); MVP (usuários, artistas, eventos e máquina de estados); concorrência (atualização atômica); geolocalização (geography, índice GiST); Token Bucket; filas (BullMQ); pagamentos (gateway, webhook, ingressos); e avaliação (carga e concorrência). Cada fase só foi iniciada após a anterior estar funcional.

Implementação dos mecanismos avaliados

Esta seção descreve, de forma resumida, como cada conceito do capítulo anterior foi implementado no protótipo.

O princípio all-or-nothing foi adotado na modelagem de eventos, por meio de uma máquina de estados explícita (DRAFT → OPEN → QUORUM_REACHED/CANCELLED → CONFIRMED → SOLD_OUT/COMPLETED): cada evento tem capacidade máxima e quórum mínimo, e o pagamento só é processado após a confirmação. A manifestação de interesse, protegida por uma constraint de unicidade (evento, usuário), incrementa o contador de interessados por uma atualização atômica condicional (UPDATE ... WHERE currentInterest < capacity), aplicada pelo PostgreSQL via lock de linha implícito, sem lock manual. Ao atingir o quórum, a transição ocorre na mesma transação; só na confirmação o sistema cria, via fila assíncrona, os pagamentos de cada interessado.

O Token Bucket protege o endpoint de manifestação de interesse, onde os interessados concorrem simultaneamente por sua vaga. A implementação roda no Redis como um script Lua via EVAL, que lê o saldo, calcula o reabastecimento e decrementa um token em uma única operação indivisível — o Redis executa Lua single-threaded, eliminando a condição de corrida sem lock distribuído. O bucket é único e global, configurável via variáveis de ambiente; requisições rejeitadas recebem HTTP 429.

As colunas de localização foram declaradas como geography(Point, 4326), e não geometry, para consultas de distância diretas em quilômetros, sem reprojeção manual. O índice GiST é criado via migration, e a busca de eventos próximos usa SQL bruto com ST_DWithin e ST_Distance sobre a coluna geography, nunca trazendo todos os eventos ao back-end para calcular distância em memória — ST_DWithin é a função beneficiada pelo índice.

O projeto não implementa um gateway próprio nem se conecta a um provedor real, já que o foco está nos algoritmos internos; a abstração expõe quatro operações — criar cobrança, consultar status, estornar e processar webhook — de modo que trocar o adapter simulado por uma integração real não exigiria alterar nenhum outro módulo. A assincronia é simulada de forma realista, disparando o mesmo caminho de código do webhook público. A idempotência é garantida por constraints de unicidade no PostgreSQL; o valor cobrado é armazenado como inteiro em centavos, sempre lido do evento, nunca informado pelo cliente da API.

Procedimentos de avaliação experimental

A avaliação combinou três verificações: (a) corretude sob concorrência — 1.000 requisições HTTP verdadeiramente concorrentes contra um evento com capacidade 100, verificando que o contador nunca ultrapassa a capacidade e que não há manifestação duplicada; (b) efeito do rate limiting — k6 gerou carga de 50 usuários virtuais por 20 segundos, comparando o rate limiter desabilitado com a configuração padrão (capacidade 100, reabastecimento 20/s); (c) efeito do índice espacial — massas sintéticas de 10 mil a 100 mil eventos, com EXPLAIN (ANALYZE, BUFFERS), com e sem o índice GiST.

Critérios de análise dos resultados

Corretude sob concorrência foi tratada como requisito obrigatório; para o Token Bucket, o critério foi o trade-off entre aceitação e proteção — manter o sistema responsivo, não maximizar aceitas; e, para o GiST, a escalabilidade em função do volume de dados. Os artefatos brutos foram preservados no repositório do projeto.


RESULTADOS E DISCUSSÕES

Este capítulo apresenta os resultados dos três procedimentos de avaliação descritos na metodologia.

Corretude do controle de concorrência de quórum

O teste automatizado disparou 1.000 requisições verdadeiramente concorrentes contra um evento com capacidade 100 e quórum mínimo 50:

| Métrica | Resultado |
| --- | ---: |
| Requisições aceitas (201) | 100 |
| Rejeitadas por capacidade esgotada (409) | 900 |
| Contador final de interessados | 100 |
| Linhas em event_interests | 100 |
| userId duplicados | 0 |
| Estado final do evento | QUORUM_REACHED |

O número de aceitas coincide exatamente com a capacidade configurada — nenhuma sobrevenda ocorreu sob 1.000 tentativas simultâneas. Um segundo cenário, no mesmo teste, disparou 20 requisições do mesmo usuário contra um evento com capacidade 10: apenas 1 foi aceita e 19 rejeitadas por violação da constraint de unicidade. Validações manuais contra o servidor real reproduziram os mesmos números, confirmando a atualização atômica condicional (metodologia) como mecanismo suficiente, sem exigir lock manual na aplicação.

Efeito do Token Bucket sob concorrência e carga

A implementação foi validada isoladamente contra Redis real: de 8 tentativas sequenciais contra um bucket de capacidade 5, exatamente 5 foram aceitas, e 50 requisições verdadeiramente concorrentes resultaram em exatamente 5 aceitas, confirmando que o script Lua elimina a condição de corrida. Manualmente, 150 requisições concorrentes contra o endpoint de produção (capacidade 100, reabastecimento 20/s) resultaram em 107 aceitas e 43 rejeitadas, coerente com o reabastecimento contínuo durante a rajada.

O efeito sobre latência e throughput foi medido com k6 (50 usuários virtuais, 20 segundos):

| Métrica | Sem Token Bucket | Com Token Bucket |
| --- | ---: | ---: |
| Aceitas (201) | 300 | 248 |
| Rejeitadas por regra de negócio (409) | 7.766 | 252 |
| Rejeitadas por rate limit (429) | 0 | 13.825 |
| Latência média | 123,9 ms | 69,7 ms |
| Latência p95 | 160,0 ms | 79,3 ms |
| Throughput | 402,3 req/s | 714,8 req/s |

Sob a rajada testada, o Token Bucket rejeitou 96,5% das requisições consultando apenas o Redis, antes de qualquer transação no PostgreSQL — o que explica a latência menor e o throughput maior mesmo com menos aceitas. O total que passou pelo bucket (500) corresponde à previsão da fórmula da fundamentação teórica, confirmando que o objetivo do rate limiter é manter o sistema responsivo, não maximizar aceitas.

Efeito do índice GiST em consultas de proximidade

O ganho de desempenho do índice foi medido com massas de 10 mil, 50 mil e 100 mil eventos, sob EXPLAIN (ANALYZE, BUFFERS):

| Cenário | Plano escolhido | Tempo |
| --- | --- | ---: |
| 10k eventos, com índice | Bitmap Index Scan | 10,3 ms |
| 50k eventos, com índice | Bitmap Index Scan | 20,7 ms |
| 100k eventos, com índice | Bitmap Index Scan | 34,9 ms |
| 100k eventos, sem índice | Parallel Seq Scan | 105,6 ms |

Sem o índice, o planejador recorre a uma varredura sequencial paralela da tabela inteira, com tempo cerca de três vezes maior que com o índice, no mesmo volume de dados. Com o índice, o tempo cresce de forma sub-linear ao multiplicar o volume por dez (10,3 ms → 34,9 ms, cerca de 3,4×, não 10×), evidenciando que o índice descarta rapidamente a tabela fora do raio de busca, sem alterar o resultado retornado.

Discussão integrada

Os três experimentos validam as decisões técnicas da metodologia: a atualização atômica garante corretude do quórum sob concorrência; o Token Bucket protege o sistema de picos de demanda reduzindo a latência média, não apenas descartando trabalho; e o índice GiST torna a descoberta de eventos próximos viável em escala, com custo sub-linear. Um ponto qualitativo, não coberto pelos experimentos de carga, é a idempotência do fluxo de pagamentos, validada apenas em nível de teste unitário — lacuna retomada como limitação a seguir.


CONSIDERAÇÕES FINAIS

Este trabalho teve como objetivo projetar, implementar e avaliar experimentalmente um protótipo de plataforma de viabilização coletiva de eventos culturais, condicionando a cobrança dos interessados à confirmação de um quórum mínimo de público — aplicando na prática o princípio all-or-nothing do crowdfunding por limiar a um domínio pouco explorado por essa literatura.

Os objetivos específicos foram demonstrados experimentalmente: confirmação automática de quórum sob concorrência real, sem sobrevenda; rate limiting funcional, com efeito positivo sobre latência e throughput; consultas de proximidade com índice GiST, com ganho mensurado e escalabilidade sub-linear; e um fluxo de pagamento em sandbox simulado, posterior à confirmação do evento, com idempotência garantida por constraints de banco de dados. Este trabalho evidencia, com dados reais e reproduzíveis, que essas técnicas resolvem problemas distintos sem competir entre si, cada uma atuando em uma camada diferente do caminho da requisição — os artefatos de avaliação foram preservados no repositório do projeto.

Três limitações contextualizam os resultados: o gateway de pagamento é simulado, e riscos de uma integração real não foram exercitados; a idempotência dos pagamentos foi validada só em nível unitário, não sob carga com webhooks concorrentes; e os experimentos foram conduzidos em ambiente local, o que impede extrapolar números absolutos a produção. Como trabalhos futuros, seguem: substituir o adapter simulado por uma integração real em sandbox; estender a avaliação de carga ao fluxo de pagamentos, com webhooks duplicados concorrentes; e avaliar o sistema em um ambiente distribuído.


REFERÊNCIAS

CARVALHO, André Emanoel de. Qualidade de serviço usando o algoritmo Token Bucket. 2023. Trabalho de Conclusão de Curso (Bacharelado em Ciência da Computação) – Universidade Tecnológica Federal do Paraná, Ponta Grossa, 2023.

DAVIES, Rodrigo. Civic Crowdfunding: Participatory Communities, Entrepreneurs and the Political Economy of Place. Dissertação (Mestrado) — Massachusetts Institute of Technology, 2014.

GRAY, Jim; REUTER, Andreas. Transaction Processing: Concepts and Techniques. San Francisco: Morgan Kaufmann, 1993.

HELLERSTEIN, Joseph M.; NAUGHTON, Jeffrey F.; PFEFFER, Avi. Generalized Search Trees for Database Systems. In: PROCEEDINGS OF THE 21TH INTERNATIONAL CONFERENCE ON VERY LARGE DATA BASES (VLDB), 1995, Zurich. Anais [...]. San Francisco: Morgan Kaufmann, 1995. p. 562–573.

HEVNER, Alan R.; MARCH, Salvatore T.; PARK, Jinsoo; RAM, Sudha. Design Science in Information Systems Research. MIS Quarterly, v. 28, n. 1, p. 75–105, 2004.

JÚNIOR, Alexandre de Oliveira. Festivais independentes: quando o lúdico se torna resistência. 2017. Trabalho de Conclusão de Curso (Gestão de Projetos Culturais) – Universidade de São Paulo, São Paulo, 2017.

KLEPPMANN, Martin. Designing Data-Intensive Applications. Sebastopol: O'Reilly Media, 2017.

MOLLICK, Ethan. The Dynamics of Crowdfunding: An Exploratory Study. Journal of Business Venturing, v. 29, n. 1, p. 1–16, 2014.

OBE, Regina O.; HSU, Leo S. PostGIS in Action. 2. ed. Shelter Island: Manning Publications, 2015.

OLIVEIRA, Guilherme Jucá de. Um sistema para recomendação de eventos locais com base nas preferências do usuário. 2018. Trabalho de Conclusão de Curso (Sistemas e Mídias Digitais) – Universidade Federal do Ceará, Fortaleza, 2018.

PEREIRA, Alysson Bispo. Sistemas de recomendação baseados em contexto físico e social. 2016. Dissertação (Mestrado em Ciência da Computação) – Universidade Federal de Pernambuco, Recife, 2016.

RODRIGUES, Marco Antonio da Silva. Armazenamento e manipulação de dados espaciais no PostgreSQL/PostGIS. 2018. Trabalho de Conclusão de Curso (Bacharelado em Sistemas de Informação) – Universidade Federal de Uberlândia, Uberlândia, 2018.

SONÁGLIO, Wagner Comin. Análise comparativa do desempenho dos métodos de acesso para dados espaciais: estudo de caso com o PostGIS. 2007. Projeto de Pesquisa de Trabalho de Conclusão de Curso – Universidade do Extremo Sul Catarinense, Criciúma, 2007.

TANENBAUM, Andrew S.; WETHERALL, David J. Computer Networks. 5. ed. Boston: Pearson, 2011.

VALIATI, Vanessa Amália Dalpizol; TIETZMANN, Roberto. Crowdfunding: o financiamento coletivo como mecanismo de fomento à produção audiovisual. XIII Congresso de Ciências da Comunicação na Região Sul, 2012.
