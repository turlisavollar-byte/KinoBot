import { injectable, inject } from 'tsyringe';
import type { Request, Response, NextFunction } from 'express';
import { ListMoviesUseCase } from '../../../domain/use-cases/list-movies.use-case';
import { GetMovieUseCase } from '../../../domain/use-cases/get-movie.use-case';
import { CreateMovieUseCase } from '../../../domain/use-cases/create-movie.use-case';
import { UpdateMovieUseCase } from '../../../domain/use-cases/update-movie.use-case';
import { DeleteMovieUseCase } from '../../../domain/use-cases/delete-movie.use-case';
import { ListSeriesUseCase } from '../../../domain/use-cases/list-series.use-case';
import { ListGenresUseCase } from '../../../domain/use-cases/list-genres.use-case';
import { ListActorsUseCase } from '../../../domain/use-cases/list-actors.use-case';
import type { ICatalogRepository } from '../../../domain/repositories/catalog.repository.interface';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class CatalogController {
  private listMoviesUC: ListMoviesUseCase;
  private getMovieUC: GetMovieUseCase;
  private createMovieUC: CreateMovieUseCase;
  private updateMovieUC: UpdateMovieUseCase;
  private deleteMovieUC: DeleteMovieUseCase;
  private listSeriesUC: ListSeriesUseCase;
  private listGenresUC: ListGenresUseCase;
  private listActorsUC: ListActorsUseCase;
  private logger: Logger;

  constructor(
    @inject('ListMoviesUseCase') listMovies: ListMoviesUseCase,
    @inject('GetMovieUseCase') getMovie: GetMovieUseCase,
    @inject('CreateMovieUseCase') createMovie: CreateMovieUseCase,
    @inject('UpdateMovieUseCase') updateMovie: UpdateMovieUseCase,
    @inject('DeleteMovieUseCase') deleteMovie: DeleteMovieUseCase,
    @inject('ListSeriesUseCase') listSeries: ListSeriesUseCase,
    @inject('ListGenresUseCase') listGenres: ListGenresUseCase,
    @inject('ListActorsUseCase') listActors: ListActorsUseCase,
  ) {
    this.listMoviesUC = listMovies;
    this.getMovieUC = getMovie;
    this.createMovieUC = createMovie;
    this.updateMovieUC = updateMovie;
    this.deleteMovieUC = deleteMovie;
    this.listSeriesUC = listSeries;
    this.listGenresUC = listGenres;
    this.listActorsUC = listActors;
    this.logger = Logger.getInstance('CatalogController');
  }

  // ─── MOVIES ──────────────────────────────────────────────────────────────────
  async listMovies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listMoviesUC.execute(req.query as any);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMovie(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const movie = await this.getMovieUC.execute(req.params.id as string);
      res.json(movie);
    } catch (error) {
      next(error);
    }
  }

  async createMovie(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const movie = await this.createMovieUC.execute(req.body);
      res.status(201).json(movie);
    } catch (error) {
      next(error);
    }
  }

  async updateMovie(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const movie = await this.updateMovieUC.execute(req.params.id as string, req.body);
      res.json(movie);
    } catch (error) {
      next(error);
    }
  }

  async deleteMovie(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.deleteMovieUC.execute(req.params.id as string);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  }

  async publishMovie(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const movie = await this.updateMovieUC.execute(req.params.id as string, { isPublished: req.body.published });
      res.json(movie);
    } catch (error) {
      next(error);
    }
  }

  // ─── SERIES ──────────────────────────────────────────────────────────────────
  async listSeries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listSeriesUC.execute(req.query as any);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ─── GENRES ──────────────────────────────────────────────────────────────────
  async listGenres(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const genres = await this.listGenresUC.execute();
      res.json(genres);
    } catch (error) {
      next(error);
    }
  }

  // ─── ACTORS ──────────────────────────────────────────────────────────────────
  async listActors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listActorsUC.execute(req.query as any);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
