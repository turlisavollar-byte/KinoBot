import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  getGetActorQueryKey,
  getGetMovieVideoCodesQueryKey,
  getListActorsQueryKey,
  getListMoviesQueryKey,
  useAttachActorToMovie,
  useDeleteActor,
  useDetachActorFromMovie,
  useGetActor,
  useListMovies,
  useUpdateActor,
  useUpdateActorMovieRole,
} from "@workspace/api-client-react";
import type { ActorDetail as ActorDetailData } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clapperboard,
  Copy,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

export default function ActorDetail() {
  const { t, formatDate, formatNumber } = useI18n();
  const { id = "" } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: actor, isLoading, error } = useGetActor(id);
  const deleteActor = useDeleteActor();
  const updateRole = useUpdateActorMovieRole();
  const detachMovie = useDetachActorFromMovie();
  const [editOpen, setEditOpen] = useState(false);
  const [addMovieOpen, setAddMovieOpen] = useState(false);
  const [roles, setRoles] = useState<Record<string, string>>({});

  const refreshActor = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetActorQueryKey(id) }),
      queryClient.invalidateQueries({ queryKey: getListActorsQueryKey() }),
      ...((actor?.movies ?? []).map((movie) =>
        queryClient.invalidateQueries({
          queryKey: getGetMovieVideoCodesQueryKey(movie.movieId),
        }),
      )),
    ]);

  const removeActor = () => {
    if (!actor || !window.confirm(t("actors.deleteConfirm"))) return;
    deleteActor.mutate(
      { id },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: getListActorsQueryKey(),
          });
          toast.success(t("actors.deleted"));
          setLocation("/catalog/actors");
        },
        onError: (deleteError) =>
          toast.error(
            deleteError instanceof Error
              ? deleteError.message
              : t("actors.deleteError"),
          ),
      },
    );
  };

  const saveRole = (movie: ActorDetailData["movies"][number]) => {
    updateRole.mutate(
      {
        id,
        movieId: movie.movieId,
        data: { role: (roles[movie.movieId] ?? movie.role ?? "").trim() || null },
      },
      {
        onSuccess: async () => {
          await refreshActor();
          toast.success(t("actors.detail.roleUpdated"));
        },
        onError: (roleError) =>
          toast.error(
            roleError instanceof Error
              ? roleError.message
              : t("actors.detail.roleUpdateError"),
          ),
      },
    );
  };

  const removeMovie = (movieId: string) => {
    if (!window.confirm(t("actors.detail.detachConfirm"))) return;
    detachMovie.mutate(
      { id, movieId },
      {
        onSuccess: async () => {
          await refreshActor();
          toast.success(t("actors.detail.detachedSuccess"));
        },
        onError: (detachError) =>
          toast.error(
            detachError instanceof Error
              ? detachError.message
              : t("actors.detail.detachError"),
          ),
      },
    );
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>;
  }
  if (error || !actor) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-destructive">{t("actors.detail.notFound")}</p>
        <Button variant="outline" onClick={() => setLocation("/catalog/actors")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("actors.detail.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <Button variant="ghost" onClick={() => setLocation("/catalog/actors")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("actors.detail.back")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> {t("actors.edit")}
          </Button>
          <Button
            variant="destructive"
            onClick={removeActor}
            disabled={deleteActor.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" /> {t("actors.delete")}
          </Button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="aspect-square overflow-hidden rounded-md bg-muted">
          {actor.photoUrl ? (
            <img
              src={actor.photoUrl}
              alt={actor.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <UserRound className="h-16 w-16" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("actors.detail.title")}</p>
            <h1 className="mt-1 text-3xl font-bold">{actor.name}</h1>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {actor.birthDate && (
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {formatDate(actor.birthDate, { dateStyle: "long" })}
              </span>
            )}
            {actor.birthPlace && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {actor.birthPlace}
              </span>
            )}
          </div>
          <div className="flex gap-6 border-y py-3 text-sm">
            <span><strong>{formatNumber(actor.stats.moviesCount)}</strong> {t("actors.detail.moviesCount")}</span>
            <span><strong>{formatNumber(actor.stats.totalViews)}</strong> {t("actors.detail.totalViews")}</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("actors.detail.biography")}</h2>
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {actor.bio || t("actors.noBiography")}
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {t("actors.detail.filmography")} ({formatNumber(actor.movies.length)})
            </h2>
          </div>
          <Button onClick={() => setAddMovieOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t("actors.detail.addMovie")}
          </Button>
        </div>

        {actor.movies.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("actors.detail.noMovies")}
          </p>
        ) : (
          <div className="space-y-3">
            {actor.movies.map((movie) => (
              <Card key={movie.movieId} className="rounded-md shadow-none">
                <CardContent className="grid gap-4 p-4 md:grid-cols-[72px_minmax(0,1fr)_minmax(220px,0.8fr)_auto] md:items-center">
                  <div className="aspect-[2/3] overflow-hidden rounded bg-muted">
                    {movie.posterUrl ? (
                      <img src={movie.posterUrl} alt={movie.title} className="h-full w-full object-cover" />
                    ) : <div className="flex h-full items-center justify-center"><Clapperboard className="h-5 w-5 text-muted-foreground" /></div>}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/catalog/movies/${movie.movieId}`} className="font-semibold hover:underline">
                      {movie.title}
                    </Link>
                    {movie.releaseYear && <p className="text-sm text-muted-foreground">{movie.releaseYear}</p>}
                    <Label htmlFor={`role-${movie.movieId}`} className="mt-3 block text-xs text-muted-foreground">
                      {t("actors.detail.role")}
                    </Label>
                    <Input
                      id={`role-${movie.movieId}`}
                      value={roles[movie.movieId] ?? movie.role ?? ""}
                      onChange={(event) => setRoles((current) => ({ ...current, [movie.movieId]: event.target.value }))}
                      placeholder={t("actors.detail.noRole")}
                      className="mt-1 h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{t("actors.detail.videoCodes")}</p>
                    {movie.videoCodes.length ? (
                      <div className="flex flex-wrap gap-2">
                        {movie.videoCodes.map((code) => {
                          const statusLabel =
                            code.status === "active"
                              ? t("telegram.videoCodes.statusActive")
                              : code.status === "pending"
                                ? t("telegram.videoCodes.statusPending")
                                : t("telegram.videoCodes.statusInactive");
                          return (
                            <button
                              key={code.id}
                              type="button"
                              className="inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-xs hover:bg-muted"
                              title={t("actors.detail.copyCode")}
                              onClick={() => {
                                void navigator.clipboard.writeText(code.code);
                                toast.success(t("actors.detail.codeCopied"));
                              }}
                            >
                              <Copy className="h-3 w-3" /> {code.code}
                              <Badge variant={code.status === "active" ? "default" : "secondary"} className="ml-1 px-1 py-0 text-[10px]">
                                {statusLabel}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    ) : <p className="text-xs text-muted-foreground">{t("actors.detail.noVideoCodes")}</p>}
                  </div>
                  <div className="flex gap-2 md:flex-col">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={t("actors.detail.saveRole")}
                      title={t("actors.detail.saveRole")}
                      disabled={updateRole.isPending}
                      onClick={() => saveRole(movie)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      aria-label={t("actors.detail.detachMovie")}
                      title={t("actors.detail.detachMovie")}
                      disabled={detachMovie.isPending}
                      onClick={() => removeMovie(movie.movieId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <EditActorDialog
        actor={actor}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={refreshActor}
      />
      <AddMovieDialog
        actorId={actor.id}
        open={addMovieOpen}
        onOpenChange={setAddMovieOpen}
        onAdded={refreshActor}
      />
    </div>
  );
}

function EditActorDialog({
  actor,
  open,
  onOpenChange,
  onSaved,
}: {
  actor: ActorDetailData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<unknown>;
}) {
  const { t } = useI18n();
  const updateActor = useUpdateActor();
  const [name, setName] = useState(actor.name);
  const [photoUrl, setPhotoUrl] = useState(actor.photoUrl ?? "");
  const [bio, setBio] = useState(actor.bio ?? "");
  const [birthDate, setBirthDate] = useState(actor.birthDate ?? "");
  const [birthPlace, setBirthPlace] = useState(actor.birthPlace ?? "");

  useEffect(() => {
    setName(actor.name);
    setPhotoUrl(actor.photoUrl ?? "");
    setBio(actor.bio ?? "");
    setBirthDate(actor.birthDate ?? "");
    setBirthPlace(actor.birthPlace ?? "");
  }, [actor]);

  const save = () => {
    updateActor.mutate(
      {
        id: actor.id,
        data: {
          name: name.trim(),
          photoUrl: photoUrl.trim(),
          bio: bio.trim(),
          birthDate: birthDate || null,
          birthPlace: birthPlace.trim() || null,
        },
      },
      {
        onSuccess: async () => {
          await onSaved();
          onOpenChange(false);
          toast.success(t("actors.detail.profileSaved"));
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{t("actors.edit")}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2"><Label>{t("actors.name")}</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="space-y-2"><Label>{t("actors.photo")}</Label><Input value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} /></div>
          <div className="space-y-2"><Label>{t("actors.detail.birthDate")}</Label><Input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></div>
          <div className="space-y-2"><Label>{t("actors.detail.birthPlace")}</Label><Input value={birthPlace} onChange={(event) => setBirthPlace(event.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>{t("actors.bio")}</Label><Textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={6} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={save} disabled={updateActor.isPending || !name.trim()}>{t("common.save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddMovieDialog({
  actorId,
  open,
  onOpenChange,
  onAdded,
}: {
  actorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => Promise<unknown>;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [movieId, setMovieId] = useState("");
  const [role, setRole] = useState("");
  const { data: movies, isLoading } = useListMovies({ search, limit: 50 });
  const attachMovie = useAttachActorToMovie();
  const movieList = movies?.data ?? [];

  const add = () => {
    if (!movieId) return;
    attachMovie.mutate(
      { id: actorId, data: { movieId, role: role.trim() || null } },
      {
        onSuccess: async () => {
          await onAdded();
          await queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
          setSearch("");
          setMovieId("");
          setRole("");
          onOpenChange(false);
          toast.success(t("actors.detail.attachedSuccess"));
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{t("actors.movieSelector.title")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("actors.movieSelector.search")}</Label>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("actors.movieSelector.searchPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("actors.movieSelector.movie")}</Label>
            <Select value={movieId || "none"} onValueChange={(value) => setMovieId(value === "none" ? "" : value)}>
              <SelectTrigger><SelectValue placeholder={t("actors.movieSelector.moviePlaceholder")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("actors.movieSelector.chooseMovie")}</SelectItem>
                {movieList.map((movie) => movie.id ? (
                  <SelectItem key={movie.id} value={movie.id}>
                    {movie.title ?? movie.id}{movie.releaseYear ? ` (${movie.releaseYear})` : ""}
                  </SelectItem>
                ) : null)}
              </SelectContent>
            </Select>
            {isLoading && <p className="text-xs text-muted-foreground">{t("common.loading")}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t("actors.detail.role")}</Label>
            <Input value={role} onChange={(event) => setRole(event.target.value)} placeholder={t("actors.movieSelector.rolePlaceholder")} maxLength={255} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button onClick={add} disabled={!movieId || attachMovie.isPending}>{t("actors.movieSelector.confirm")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
