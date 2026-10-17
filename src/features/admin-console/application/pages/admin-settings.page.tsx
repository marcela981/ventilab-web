/*
* Funcionalidad: AdminSettingsPage
* Descripción: Page /admin/settings (ADMIN): one request for every platform setting (`GET /api/platform-settings`) grouped into tabs per category (IA, evaluaciones, simulación, reservas, telemetría, comandos del ventilador; the tab lives in ?category). Each setting is a SettingCard whose form is generated from its metadata. The AI tab also reads `GET /api/system/status` for the providers with credentials offered by the provider chain editor. The ventilator commands tab warns that its changes need a second confirmation. Depends on MUI, next/head, next/router, the design-system states, the admin console hooks, components, config and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import TuneIcon from "@mui/icons-material/Tune";
import Alert from "@mui/material/Alert";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Head from "next/head";
import { useRouter } from "next/router";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { SettingCard } from "../components/setting-card";
import { CATEGORY_LABELS, DEFAULT_SETTING_CATEGORY, isSettingCategory, SETTING_CATEGORIES } from "../config/admin-console.config";
import type { SettingCategory } from "../config/admin-console.config";
import { getAdminConsoleErrorMessage } from "../entities/admin-console-error-messages";
import { useConfiguredProviders } from "../hooks/use-configured-providers";
import { usePlatformSettings } from "../hooks/use-platform-settings";
import styles from "../../UI/admin-settings.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const ADMIN_SETTINGS_COPY = {
  documentTitle: "Configuración | VentyLab",
  title: "Configuración de la plataforma",
  subtitle: "Valores que se aplican sin reiniciar el servidor, siempre dentro de sus límites duros.",
  tabsLabel: "Categorías de configuración",
  loading: "Cargando la configuración…",
  loadErrorTitle: "No se pudo cargar la configuración",
  emptyTitle: "No hay ajustes en esta categoría",
  commandsWarning: "Estos ajustes limitan los comandos del ventilador físico. Guardar o restablecer pide una confirmación adicional con el valor anterior, el nuevo y sus límites.",
} as const;

function tabId(category: SettingCategory): string {
  return `admin-settings-tab-${category}`;
}

function panelId(category: SettingCategory): string {
  return `admin-settings-panel-${category}`;
}

export function AdminSettingsPage() {
  const router = useRouter();
  const requested = router.query.category;
  const category: SettingCategory = isSettingCategory(requested) ? requested : DEFAULT_SETTING_CATEGORY;
  const { settings, isLoading, error, reload, save, reset } = usePlatformSettings();
  const providers = useConfiguredProviders(category === "ai");
  const providersContext = { configured: providers.providers, failed: providers.error !== null };

  const selectCategory = (next: SettingCategory) => {
    void router.replace({ pathname: router.pathname, query: { ...router.query, category: next } }, undefined, { shallow: true });
  };

  const renderPanel = () => {
    if (!settings) {
      if (error) {
        return <ErrorState title={ADMIN_SETTINGS_COPY.loadErrorTitle} description={getAdminConsoleErrorMessage(error)} onRetry={() => void reload()} />;
      }

      return isLoading || !router.isReady ? <CardSkeleton label={ADMIN_SETTINGS_COPY.loading} /> : null;
    }

    const items = settings[category];

    if (items.length === 0) {
      return <EmptyState icon={<TuneIcon />} title={ADMIN_SETTINGS_COPY.emptyTitle} />;
    }

    return (
      <div className={cx(styles.cards)}>
        {category === "commands" ? <Alert severity="warning">{ADMIN_SETTINGS_COPY.commandsWarning}</Alert> : null}
        {items.map((setting) => (
          <SettingCard
            key={`${setting.key}:${setting.version}:${setting.origin}`}
            setting={setting}
            providers={providersContext}
            onSave={save}
            onReset={reset}
            onReload={reload}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{ADMIN_SETTINGS_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={ADMIN_SETTINGS_COPY.title} subtitle={ADMIN_SETTINGS_COPY.subtitle} />
      <Tabs
        value={category}
        onChange={(_event, next: SettingCategory) => selectCategory(next)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label={ADMIN_SETTINGS_COPY.tabsLabel}
        className={cx(styles.tabs)}
      >
        {SETTING_CATEGORIES.map((item) => (
          <Tab key={item} value={item} label={CATEGORY_LABELS[item]} id={tabId(item)} aria-controls={panelId(item)} />
        ))}
      </Tabs>
      <div role="tabpanel" id={panelId(category)} aria-labelledby={tabId(category)} className={cx(styles.content)}>
        {renderPanel()}
      </div>
    </div>
  );
}
