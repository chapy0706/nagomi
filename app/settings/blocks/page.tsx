import Link from "next/link";
import { redirect } from "next/navigation";
import { AvatarImage } from "@/app/_components/AvatarImage";
import { unblockFromListAction } from "@/app/settings/blocks/actions";
import { createBlockRepository } from "@/src/infrastructure/repositoryFactory";
import { getSessionContext } from "@/src/infrastructure/session";

export const metadata = { title: "ブロックリスト | nagomi" };

export default async function BlocksPage() {
  const { authUserId, employee } = await getSessionContext();
  if (employee.consentAcceptedAt === undefined) redirect("/onboarding/pin");

  const blocked = await createBlockRepository().findBlockedSummaries(authUserId);

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8">
        <Link
          href="/settings/profile"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← プロフィール設定
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-gray-900">ブロックリスト</h1>
      <p className="mb-8 text-sm text-gray-500">
        ブロックした相手からの招待は届かなくなります。いつでも解除できます。
      </p>

      <section className="rounded-xl bg-white shadow-sm overflow-hidden">
        {blocked.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">
            ブロックしているユーザーはいません
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {blocked.map((b) => (
              <li key={b.blockedAuthId} className="flex items-center gap-4 px-6 py-4">
                <AvatarImage
                  displayName={b.displayName}
                  avatarUrl={b.avatarUrl}
                  seed={b.blockedAuthId}
                  size={40}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{b.displayName}</p>
                  <p className="text-xs text-gray-400">
                    {b.blockedAt.toLocaleDateString("ja-JP")} にブロック
                  </p>
                </div>
                <form action={unblockFromListAction}>
                  <input type="hidden" name="blockedAuthId" value={b.blockedAuthId} />
                  <button
                    type="submit"
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    解除
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
