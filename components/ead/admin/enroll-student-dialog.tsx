"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { enrollStudentAction } from "@/lib/actions/ead/tenant-settings-action";
import { UserPlus } from "lucide-react";

interface Props {
  courses: Array<{ id: string; title: string }>;
}

export function EnrollStudentDialog({ courses }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [accessDays, setAccessDays] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !courseId) return;

    startTransition(async () => {
      const result = await enrollStudentAction({
        course_id:   courseId,
        user_email:  email.trim(),
        access_days: accessDays ? parseInt(accessDays, 10) : undefined,
        notes:       notes || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Aluno matriculado!");
        setOpen(false);
        setEmail("");
        setNotes("");
        setAccessDays("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button size="sm" type="button">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Matricular aluno
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Matricular aluno manualmente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Curso</Label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background text-sm px-3 outline-none focus:ring-2 focus:ring-ring"
              required
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>E-mail do aluno</Label>
            <Input
              type="email"
              placeholder="aluno@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">O aluno precisa já ter uma conta na plataforma.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Dias de acesso (opcional)</Label>
            <Input
              type="number"
              min={1}
              placeholder="Padrão do curso"
              value={accessDays}
              onChange={(e) => setAccessDays(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Observação (opcional)</Label>
            <Input
              placeholder="Cortesia, bônus, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Matriculando…" : "Matricular"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
