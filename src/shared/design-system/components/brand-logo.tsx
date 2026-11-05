/*
* Funcionalidad: VentyLab brand logo (light and dark variants)
* Descripción: The VentyLab logo as two next/image elements (public/images/logo.png, white outlines for dark backgrounds, and logo-light.png, navy outlines for light ones, derived by scripts/generate-logo-light.mjs; there is no SVG of the logo) of which CSS shows only the one that matches the active mode (data-mui-color-scheme on <html>), so the right variant is on screen from the first paint, without JavaScript. The height comes from the `size` prop (sidebar 40px, auth 64px); the alt text names the brand once (the hidden variant is aria-hidden). Depends on next/image, React and UI/brand-logo.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Image from "next/image";
import { cx } from "@shared/lib/class-names";
import styles from "./UI/brand-logo.module.css";

// public/images/logo.png and logo-light.png: 708 x 353.
const LOGO_WIDTH = 708;
const LOGO_HEIGHT = 353;
const LOGO_DARK_SRC = "/images/logo.png";
const LOGO_LIGHT_SRC = "/images/logo-light.png";

export type BrandLogoProps = {
  alt?: string
  size?: "sidebar" | "auth"
  priority?: boolean
  className?: string
};

export function BrandLogo({ alt = "VentyLab", size = "sidebar", priority = false, className }: BrandLogoProps) {
  return (
    <span className={cx(styles.root, className)} data-size={size} role="img" aria-label={alt}>
      <Image src={LOGO_DARK_SRC} alt="" width={LOGO_WIDTH} height={LOGO_HEIGHT} priority={priority} className={cx(styles.image, styles.onDark)} />
      <Image src={LOGO_LIGHT_SRC} alt="" width={LOGO_WIDTH} height={LOGO_HEIGHT} priority={priority} className={cx(styles.image, styles.onLight)} />
    </span>
  );
}
