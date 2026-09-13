import { Compass } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { ButtonLink } from '../components/ui';
import { useDocumentMeta } from '../lib/hooks';
import { useI18n } from '../lib/i18n';

export default function NotFoundPage() {
  const { t } = useI18n();
  useDocumentMeta(t('common.notFound'));
  return (
    <PageHero eyebrow="404" title={t('common.notFound')} subtitle={t('common.notFoundBody')} size="lg">
      <div className="flex flex-wrap gap-3">
        <ButtonLink to="/" icon>
          {t('common.goHome')}
        </ButtonLink>
        <ButtonLink to="/tours" variant="glass">
          <Compass size={18} aria-hidden="true" />
          {t('nav.tours')}
        </ButtonLink>
      </div>
    </PageHero>
  );
}
