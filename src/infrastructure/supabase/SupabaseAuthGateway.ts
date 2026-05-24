import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthGateway, AuthResult } from "@/src/domain/ports/AuthGateway";
import type { EmployeeId } from "@/src/domain/value-objects/EmployeeId";
import type { Pin } from "@/src/domain/value-objects/Pin";

const PSEUDO_EMAIL_DOMAIN = "@employees.internal";

export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly client: SupabaseClient) {}

  async signIn(employeeId: EmployeeId, pin: string): Promise<AuthResult> {
    const email = `${employeeId.value}${PSEUDO_EMAIL_DOMAIN}`;
    const { data, error } = await this.client.auth.signInWithPassword({ email, password: pin });

    if (error || !data.user) {
      return { success: false, reason: "invalid_credentials" };
    }
    return { success: true, authUserId: data.user.id };
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async getAuthUserId(): Promise<string | undefined> {
    const { data } = await this.client.auth.getUser();
    return data.user?.id;
  }

  async updatePassword(newPin: Pin): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password: newPin.value });
    if (error) throw new Error(`パスワード更新に失敗しました: ${error.message}`);
  }
}
