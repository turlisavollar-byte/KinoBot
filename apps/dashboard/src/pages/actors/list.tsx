import { useState } from "react";
import { useListActors, useCreateActor, useUpdateActor, getListActorsQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

export default function ActorsList() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data: actors, isLoading } = useListActors({ search });
  const createActor = useCreateActor();
  const updateActor = useUpdateActor();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [editingActor, setEditingActor] = useState<any>(null);
  
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");

  const openAdd = () => {
    setEditingActor(null);
    setName("");
    setPhotoUrl("");
    setBio("");
    setIsOpen(true);
  };

  const openEdit = (actor: any) => {
    setEditingActor(actor);
    setName(actor.name);
    setPhotoUrl(actor.photoUrl || "");
    setBio(actor.bio || "");
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!name) return;
    
    if (editingActor) {
      updateActor.mutate({ id: editingActor.id, data: { name, photoUrl, bio } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListActorsQueryKey() });
          setIsOpen(false);
        }
      });
    } else {
      createActor.mutate({ data: { name, photoUrl, bio } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListActorsQueryKey() });
          setIsOpen(false);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("actors.title")}</h1>
          <p className="text-muted-foreground">{t("actors.list")}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t("actors.add")}
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("actors.list")}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">{t("actors.photo")}</TableHead>
              <TableHead>{t("actors.name")}</TableHead>
              <TableHead>{t("actors.bio")}</TableHead>
              <TableHead className="text-right">{t("common.edit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">{t("common.loading")}</TableCell></TableRow>
            ) : actors?.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">{t("actors.noActors")}</TableCell></TableRow>
            ) : (
              actors?.map((actor: any) => (
                <TableRow key={actor.id}>
                  <TableCell>
                    {actor.photoUrl ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                        <img src={actor.photoUrl} alt={actor.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        {actor.name.charAt(0)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{actor.name}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {actor.bio || t("actors.noActors")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(actor)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t("common.edit")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActor ? t("actors.edit") : t("actors.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("actors.name")}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("actors.name")} />
            </div>
            <div className="space-y-2">
              <Label>{t("actors.photo")}</Label>
              <Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>{t("actors.bio")}</Label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={createActor.isPending || updateActor.isPending}>
              {editingActor ? t("common.save") : t("actors.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
