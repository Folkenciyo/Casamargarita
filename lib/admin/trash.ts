/**
 * Constantes de la papelera.
 *
 * En módulo aparte porque `actions.ts` lleva `"use server"`, y de un fichero
 * así Next solo deja exportar funciones async: una constante suelta rompe la
 * compilación del panel entero.
 */

/** Días que una obra espera en la papelera antes del borrado definitivo. */
export const DIAS_EN_PAPELERA = 30;
