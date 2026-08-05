import { useLegacyMessages } from "../i18n";

export function FileDiffErrorRow({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();

  return (
    <tr>
      <td colSpan={3}>{t(messageKey)}</td>
    </tr>
  );
}
