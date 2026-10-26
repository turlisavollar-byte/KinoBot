import { useMemo, useState } from "react";
import { useCreateAdminUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const roleOptions = ["admin", "moderator"];

function generatePassword(length = 16) {
  const groups = [
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789",
    "!@#$%^&*",
  ];
  const charset = groups.join("");
  const passwordLength = Math.max(length, groups.length);
  const randomIndex = (max: number) => {
    const randomValue = new Uint32Array(1);
    window.crypto.getRandomValues(randomValue);
    return randomValue[0] % max;
  };
  const characters = groups.map((group) => group[randomIndex(group.length)]);

  while (characters.length < passwordLength) {
    characters.push(charset[randomIndex(charset.length)]);
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ];
  }

  return characters.join("");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn("navigator.clipboard failed, trying fallback", error);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "2em";
    textarea.style.height = "2em";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.boxShadow = "none";
    textarea.style.background = "transparent";
    textarea.style.opacity = "0";
    textarea.setAttribute("readonly", "");
    document.body.appendChild(textarea);
    try {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      if (document.execCommand("copy")) return true;
    } finally {
      document.body.removeChild(textarea);
    }
  } catch (error) {
    console.warn("execCommand fallback failed", error);
  }

  return false;
}

export function AddAdminModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const createAdminUser = useCreateAdminUser();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [password, setPassword] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const generatePasswordValue = () => {
    const next = generatePassword(16);
    setPassword(next);
    setCreatedPassword(null);
  };

  const handleCopy = async () => {
    if (!password) return;
    if (await copyToClipboard(password)) {
      toast.success("Password copied to clipboard");
      return;
    }

    const passwordInput = document.getElementById(
      "admin-password",
    ) as HTMLInputElement | null;
    passwordInput?.focus();
    passwordInput?.select();
    toast.error("Copy failed. Password selected; press Ctrl+C to copy it.");
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    if (!password) {
      toast.error("Generate a password before submitting");
      return;
    }

    try {
      const result = await createAdminUser.mutateAsync({
        data: {
          email: email.trim(),
          role: role as "admin" | "moderator",
          password,
        },
      });
      const responsePassword = password;
      setCreatedPassword(responsePassword);
      setPassword("");
      setEmail("");
      setRole("admin");
      toast.success(`Admin created. Password: ${responsePassword}`);
      onSuccess?.();
      if (result?.data?.email) {
        // keep the generated password visible once for the user to copy
      }
    } catch (error) {
      toast.error("Could not create admin account");
      console.error(error);
    }
  };

  const resetAndClose = () => {
    setEmail("");
    setPassword("");
    setRole("admin");
    setCreatedPassword(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add admin</DialogTitle>
          <DialogDescription>
            Invite a new administrator with a one-time password.
          </DialogDescription>
        </DialogHeader>

        {createdPassword ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Save this password now
            </div>
            <div className="rounded bg-white px-3 py-2 font-mono text-sm dark:bg-slate-950">
              {createdPassword}
            </div>
            <p className="mt-3 text-xs">
              This password will not be shown again after you close this dialog.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="admin-password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePasswordValue}
                  className="whitespace-nowrap"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </div>
              {password ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="mt-2"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy password
                </Button>
              ) : null}
            </div>

            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
              The new admin must change this password on first sign-in.
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          {!createdPassword ? (
            <Button
              onClick={() => void handleSubmit()}
              disabled={createAdminUser.isPending}
            >
              {createAdminUser.isPending ? "Creating…" : "Create"}
            </Button>
          ) : (
            <Button onClick={resetAndClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
