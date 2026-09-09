import { useState } from "react";
import { useListGenres, useCreateGenre, useUpdateGenre, useDeleteGenre, getListGenresQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export default function GenresList() {
  const { t } = useI18n();
  const { data: genres, isLoading } = useListGenres();
  const createGenre = useCreateGenre();
  const updateGenre = useUpdateGenre();
  const deleteGenre = useDeleteGenre();
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  const handleSave = () => {
    if (!editName || !editSlug) return;
    
    if (editingId) {
      updateGenre.mutate({ id: editingId, data: { name: editName, slug: editSlug } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGenresQueryKey() });
          setEditingId(null);
        }
      });
    } else {
      createGenre.mutate({ data: { name: editName, slug: editSlug } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGenresQueryKey() });
          setIsAdding(false);
        }
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const startEdit = (genre: any) => {
    setEditingId(genre.id);
    setEditName(genre.name);
    setEditSlug(genre.slug);
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setEditName("");
    setEditSlug("");
  };

  const handleDelete = (id: number) => {
    if (confirm(t("genres.deleteConfirm"))) {
      deleteGenre.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGenresQueryKey() })
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("genres.title")}</h1>
          <p className="text-muted-foreground">{t("genres.list")}</p>
        </div>
        <Button onClick={startAdd} disabled={isAdding || editingId !== null}>
          <Plus className="mr-2 h-4 w-4" />
          {t("genres.add")}
        </Button>
      </div>

      <Card>
        <CardHeader className="sr-only"><CardTitle>{t("genres.list")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("genres.name")}</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">{t("common.edit")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdding && (
                <TableRow>
                  <TableCell>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder={t("genres.name")} />
                  </TableCell>
                  <TableCell>
                    <Input value={editSlug} onChange={e => setEditSlug(e.target.value)} placeholder="slug" />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" onClick={handleSave} disabled={createGenre.isPending}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} disabled={createGenre.isPending}><X className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              )}
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8">{t("common.loading")}</TableCell></TableRow>
              ) : genres?.length === 0 && !isAdding ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8">{t("genres.noGenres")}</TableCell></TableRow>
              ) : (
                genres?.map((genre) => (
                  <TableRow key={genre.id}>
                    <TableCell>
                      {editingId === genre.id ? (
                        <Input value={editName} onChange={e => setEditName(e.target.value)} />
                      ) : (
                        <div className="font-medium">{genre.name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === genre.id ? (
                        <Input value={editSlug} onChange={e => setEditSlug(e.target.value)} />
                      ) : (
                        <div className="text-muted-foreground">{genre.slug}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {editingId === genre.id ? (
                        <>
                          <Button size="sm" onClick={handleSave} disabled={updateGenre.isPending}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" onClick={handleCancel} disabled={updateGenre.isPending}><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(genre)} disabled={isAdding || editingId !== null}><Edit className="h-4 w-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(genre.id)} disabled={isAdding || editingId !== null}><Trash className="h-4 w-4" /></Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
