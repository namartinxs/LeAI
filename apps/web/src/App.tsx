import { useReadingController } from './controllers/useReadingController';
import { ReadingView } from './views/ReadingView';

/** Composition root: só liga controller e view. Sem lógica de negócio aqui. */
export function App() {
  const reading = useReadingController();
  return <ReadingView {...reading} onPickImage={reading.readImage} onStop={reading.stop} />;
}
