import {
  useListNotificationTemplates,
  useCreateNotificationTemplate,
  useBroadcastNotification,
  getListNotificationTemplatesQueryKey,
  useListTelegramChannels,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Plus,
  MessageSquare,
  Image,
  Video,
  Music2,
  Mic,
  FileText,
  Eye,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

type TemplateButton = { text: string; url: string };

export default function NotificationsList() {
  const { t } = useI18n();
  const { data: templates, isLoading } = useListNotificationTemplates();
  const createTemplate = useCreateNotificationTemplate();
  const broadcast = useBroadcastNotification();
  const { data: channels } = useListTelegramChannels();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("text");
  const [mediaFileId, setMediaFileId] = useState("");
  const [parseMode, setParseMode] = useState("HTML");
  const [buttons, setButtons] = useState<TemplateButton[]>([
    { text: "", url: "" },
  ]);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientType, setRecipientType] = useState<"users" | "channels">(
    "users",
  );
  const [selectedChannel, setSelectedChannel] = useState("");

  const handleCreate = () => {
    if (!name || !content) return;
    if (contentType !== "text" && !mediaFileId.trim()) {
      toast({ title: "Media File ID is required", variant: "destructive" });
      return;
    }
    createTemplate.mutate(
      {
        data: {
          name,
          content,
          channel: "telegram",
          contentType: contentType as
            | "text"
            | "photo"
            | "video"
            | "animation"
            | "audio"
            | "voice"
            | "document",
          mediaFileId: mediaFileId.trim() || null,
          parseMode: parseMode as "HTML" | "Markdown" | "MarkdownV2",
          buttons: buttons.filter(
            (button) => button.text.trim() && button.url.trim(),
          ),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListNotificationTemplatesQueryKey(),
          });
          setIsOpen(false);
          setName("");
          setContent("");
          setContentType("text");
          setMediaFileId("");
          setParseMode("HTML");
          setButtons([{ text: "", url: "" }]);
        },
      },
    );
  };

  const handleBroadcast = () => {
    if (!selectedTemplate) return;
    broadcast.mutate(
      {
        data: {
          templateId: selectedTemplate,
          recipients,
          recipientType,
        },
      },
      {
        onSuccess: (res) => {
          setBroadcastOpen(false);
          toast({
            title: "Broadcast Scheduled",
            description:
              recipientType === "channels"
                ? `Message ${res.data?.messageId || "created"} queued for ${recipients.length} channels.`
                : `Message ${res.data?.messageId || "created"} queued for ${res.data?.recipientCount ?? recipients.length} users.`,
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("notifications.title")}</h1>
          <p className="text-muted-foreground">
            {t("notifications.list")}
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("notifications.add")}
          </Button>
          <Button
            onClick={() => setBroadcastOpen(true)}
            className="bg-primary text-primary-foreground"
          >
            <Send className="w-4 h-4 mr-2" />
            {t("dashboard.broadcast")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : templates?.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-muted-foreground border rounded-md border-dashed">
            {t("notifications.noNotifications")}
          </div>
        ) : (
          templates?.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between">
                  <span>{t.name}</span>
                  <span className="text-xs uppercase bg-muted px-2 py-1 rounded text-muted-foreground">
                    {t.channel}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-md font-mono text-sm whitespace-pre-wrap text-muted-foreground">
                  {t.content}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("notifications.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("notifications.templateName")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("notifications.templateNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("notifications.messageContent")}</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("notifications.messagePlaceholder")}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                {t("notifications.variablesHint")}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("notifications.contentType")}</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">{t("notifications.textMessage")}</SelectItem>
                    <SelectItem value="photo">{t("notifications.photo")}</SelectItem>
                    <SelectItem value="video">{t("notifications.video")}</SelectItem>
                    <SelectItem value="animation">{t("notifications.animation")}</SelectItem>
                    <SelectItem value="audio">{t("notifications.audio")}</SelectItem>
                    <SelectItem value="voice">{t("notifications.voice")}</SelectItem>
                    <SelectItem value="document">{t("notifications.document")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("notifications.parseMode")}</Label>
                <Select value={parseMode} onValueChange={setParseMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HTML">HTML</SelectItem>
                    <SelectItem value="Markdown">Markdown</SelectItem>
                    <SelectItem value="MarkdownV2">MarkdownV2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {contentType !== "text" && (
              <div className="space-y-2">
                <Label>{t("notifications.mediaFileId")}</Label>
                <Input
                  value={mediaFileId}
                  onChange={(event) => setMediaFileId(event.target.value)}
                  placeholder="BAACAgIAAxkBA..."
                  className="font-mono text-xs"
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("notifications.inlineButtons")}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setButtons((current) =>
                      current.length < 3
                        ? [...current, { text: "", url: "" }]
                        : current,
                    )
                  }
                  disabled={buttons.length >= 3}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t("notifications.addButton")}
                </Button>
              </div>
              {buttons.map((button, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_1.4fr_auto] gap-2"
                >
                  <Input
                    value={button.text}
                    onChange={(event) =>
                      setButtons((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, text: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder={t("notifications.buttonText")}
                  />
                  <Input
                    value={button.url}
                    onChange={(event) =>
                      setButtons((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, url: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="https://example.com"
                    type="url"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setButtons((current) =>
                        current.length === 1
                          ? [{ text: "", url: "" }]
                          : current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                      )
                    }
                    aria-label="Remove button"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-sky-500/20 bg-sky-950/20 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-300 mb-3">
                <Eye className="h-3.5 w-3.5" /> {t("notifications.telegramPreview")}
              </div>
              <div className="rounded-md bg-slate-900/80 p-3 text-sm whitespace-pre-wrap">
                {content || t("notifications.previewPlaceholder")}
              </div>
              {buttons.some(
                (button) => button.text.trim() && button.url.trim(),
              ) && (
                <div className="grid gap-1.5 mt-2">
                  {buttons
                    .filter((button) => button.text.trim() && button.url.trim())
                    .map((button, index) => (
                      <div
                        key={index}
                        className="rounded bg-sky-500/15 px-3 py-1.5 text-center text-xs text-sky-300"
                      >
                        {button.text}
                      </div>
                    ))}
                </div>
              )}
              {contentType !== "text" && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Image className="h-3.5 w-3.5" /> {contentType} {t("notifications.mediaAttached")}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending}>
              {t("notifications.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Broadcast</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipient type</Label>
              <Select
                value={recipientType}
                onValueChange={(value) => {
                  setRecipientType(value as "users" | "channels");
                  setRecipients([]);
                  setSelectedChannel("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">Telegram users</SelectItem>
                  <SelectItem value="channels">Telegram channels</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {recipientType === "channels"
                  ? "Recipients (Telegram channels)"
                  : "Recipients (User IDs)"}
              </Label>
              {recipientType === "channels" &&
                channels &&
                channels.length > 0 && (
                  <Select
                    value={selectedChannel}
                    onValueChange={(value) => {
                      setSelectedChannel("");
                      if (!recipients.includes(value)) {
                        setRecipients((current) => [...current, value]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a registered channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels
                        .filter((channel) => channel.isActive)
                        .map((channel) => (
                          <SelectItem
                            key={channel.id}
                            value={channel.channelId}
                          >
                            {channel.title} ({channel.channelId})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              <Input
                value={recipients.join(",")}
                onChange={(e) =>
                  setRecipients(
                    e.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  )
                }
                placeholder={
                  recipientType === "channels"
                    ? "-1001234567890,@channelname"
                    : "user1,user2,user3"
                }
              />
              <p className="text-xs text-muted-foreground">
                {recipientType === "channels"
                  ? "Choose registered channels or enter Telegram channel IDs separated by commas."
                  : "Comma-separated user IDs. Leave empty for all users."}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBroadcastOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBroadcast}
              disabled={
                broadcast.isPending ||
                !selectedTemplate ||
                (recipientType === "channels" && recipients.length === 0)
              }
              className="bg-primary text-primary-foreground"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
