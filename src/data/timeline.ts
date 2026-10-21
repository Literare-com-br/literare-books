export interface JourneyItem { id: string; title: string }
export const timelineContent: { title: string; items: JourneyItem[] } = {
  title: 'Nosso processo editorial.',
  items: [
    { id: 'avaliacao', title: 'Avaliação de conteúdo' },
    { id: 'reuniao', title: 'Reunião com Autor(a)' },
    { id: 'capa', title: 'Criação de Capa' },
    { id: 'preparacao', title: 'Preparação para revisão' },
    { id: 'diagramacao', title: 'Diagramação' },
    { id: 'checklist', title: 'Checklist do Editor' },
    { id: 'grafica', title: 'Envio para a gráfica' },
  ],
};
