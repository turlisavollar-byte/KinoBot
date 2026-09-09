import { container } from 'tsyringe';
import { DrizzleCatalogRepository } from './application/repositories/drizzle-catalog.repository';
import { ListMoviesUseCase } from './domain/use-cases/list-movies.use-case';
import { GetMovieUseCase } from './domain/use-cases/get-movie.use-case';
import { CreateMovieUseCase } from './domain/use-cases/create-movie.use-case';
import { UpdateMovieUseCase } from './domain/use-cases/update-movie.use-case';
import { DeleteMovieUseCase } from './domain/use-cases/delete-movie.use-case';
import { ListSeriesUseCase } from './domain/use-cases/list-series.use-case';
import { ListGenresUseCase } from './domain/use-cases/list-genres.use-case';
import { ListActorsUseCase } from './domain/use-cases/list-actors.use-case';
import type { ICatalogRepository } from './domain/repositories/catalog.repository.interface';
import catalogRouter from './interface/http/routes/catalog.routes';
import { Logger } from '@/shared/utils/logger';

const logger = Logger.getInstance('CatalogModule');

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  
  // Register repository
  container.registerSingleton<ICatalogRepository>('ICatalogRepository', DrizzleCatalogRepository);

  // Register use cases
  container.registerSingleton('ListMoviesUseCase', ListMoviesUseCase);
  container.registerSingleton('GetMovieUseCase', GetMovieUseCase);
  container.registerSingleton('CreateMovieUseCase', CreateMovieUseCase);
  container.registerSingleton('UpdateMovieUseCase', UpdateMovieUseCase);
  container.registerSingleton('DeleteMovieUseCase', DeleteMovieUseCase);
  container.registerSingleton('ListSeriesUseCase', ListSeriesUseCase);
  container.registerSingleton('ListGenresUseCase', ListGenresUseCase);
  container.registerSingleton('ListActorsUseCase', ListActorsUseCase);

  initialized = true;
  logger.info('Catalog module dependencies registered');
}

export function initCatalogModule(app: any): void {
  ensureInitialized();
  // Register routes
  app.use('/api', catalogRouter);

  logger.info('Catalog module initialized');
}

export { catalogRouter };
export default catalogRouter;
