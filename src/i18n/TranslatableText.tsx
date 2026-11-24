import { useTranslation } from 'react-i18next';

type TranslatableTextProps = { i18nKey: string };

export default function TranslatableText({ i18nKey }: TranslatableTextProps) {
  const { t } = useTranslation();
  return <>{t(i18nKey, { keySeparator: false })}</>;
}
