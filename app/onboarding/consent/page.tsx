import { readFileSync } from "node:fs";
import { join } from "node:path";
import { redirect } from "next/navigation";
import { createEmployeeRepository } from "@/src/infrastructure/repositoryFactory";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";
import { ConsentForm } from "./ConsentForm";

export const metadata = { title: "利用同意 | nagomi" };

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; lines: string[] };

function parseMarkdown(md: string): Block[] {
  return md
    .split(/\n\n+/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((block): Block => {
      if (block.startsWith("# ")) return { type: "h1", text: block.replace(/^# /, "") };
      if (block.startsWith("## ")) return { type: "h2", text: block.replace(/^## /, "") };
      return { type: "p", lines: block.split("\n").map((l) => l.replace(/^- /, "・")) };
    });
}

export default async function ConsentPage() {
  const serverClient = await createSupabaseServerClient();
  const { data } = await serverClient.auth.getUser();
  if (!data.user) redirect("/login");

  const employee = await createEmployeeRepository().findByAuthUserId(data.user.id);

  if (employee?.consentAcceptedAt !== undefined) redirect("/");

  const policyPath = join(process.cwd(), "docs", "privacy-policy.md");
  const blocks = parseMarkdown(readFileSync(policyPath, "utf-8"));

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-xl rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900">
          利用規約・プライバシーポリシー
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          以下をお読みいただき、同意の上でご利用ください。
        </p>

        <div className="mb-6 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
          {blocks.map((block) => {
            if (block.type === "h1") {
              return (
                <h2
                  key={block.text}
                  className="mb-3 mt-4 text-base font-semibold text-gray-900 first:mt-0"
                >
                  {block.text}
                </h2>
              );
            }
            if (block.type === "h2") {
              return (
                <h3 key={block.text} className="mb-2 mt-3 text-sm font-semibold text-gray-800">
                  {block.text}
                </h3>
              );
            }
            return (
              <p key={block.lines[0]} className="mb-2 text-sm leading-relaxed text-gray-700">
                {block.lines.map((line, j) => (
                  <span key={line}>
                    {line}
                    {j < block.lines.length - 1 && <br />}
                  </span>
                ))}
              </p>
            );
          })}
        </div>

        <ConsentForm />
      </div>
    </main>
  );
}
