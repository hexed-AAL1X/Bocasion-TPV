<a id="readme-top"></a>
<!-- SHIELDS -->
<img src="https://github.com/AnderMendoza/AnderMendoza/raw/main/assets/line-neon.gif" width="100%">
<p align='center'>
  <img alt="GitHub Repo contributors" src="https://img.shields.io/github/contributors/hexed-AAL1X/Bocasion-TPV?style=for-the-badge">&nbsp;
  <img alt="GitHub Repo forks" src="https://img.shields.io/github/forks/hexed-AAL1X/Bocasion-TPV?style=for-the-badge">&nbsp;
  <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/hexed-AAL1X/Bocasion-TPV?style=for-the-badge">&nbsp;
  <img alt="GitHub Repo issues" src="https://img.shields.io/github/issues/hexed-AAL1X/Bocasion-TPV?style=for-the-badge">&nbsp;
</p>

<!-- PROJECT LOGO -->
<br>
<div align="center">
   <img src="assets/images/logo.png" alt="Logo Bocasión" width="220">
   <h3 align="center">Intranet Ventas</h3>
   <p align="center">
     Aplicación de escritorio TPV para BOCASIÓN S.A.C.
     <br>
     <a href="https://github.com/hexed-AAL1X/Bocasion-TPV"><strong>Explorar el repositorio »</strong></a>
     <br>
     <br>
     <a href="https://github.com/hexed-AAL1X/Bocasion-TPV/releases">Descargas</a>
     ·
     <a href="https://github.com/hexed-AAL1X/Bocasion-TPV/issues/new?labels=bug">Reportar error</a>
     ·
     <a href="https://github.com/hexed-AAL1X/Bocasion-TPV/issues/new?labels=enhancement">Pedir mejora</a>
   </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Tabla de contenidos</summary>
  <ol>
    <li>
      <a href="#sobre-el-proyecto">Sobre el proyecto</a>
      <ul>
        <li><a href="#tecnologias">Tecnologías</a></li>
      </ul>
    </li>
    <li><a href="#avisos-importantes">Avisos importantes</a></li>
    <li>
      <a href="#primeros-pasos">Primeros pasos</a>
      <ul>
        <li><a href="#requisitos">Requisitos</a></li>
        <li><a href="#instalacion">Instalación</a></li>
      </ul>
    </li>
    <li><a href="#contribuir">Contribuir</a></li>
    <li><a href="#contacto">Contacto</a></li>
  </ol>
</details>
<br>

<!-- ABOUT THE PROJECT -->
<a id="sobre-el-proyecto"></a>***Sobre el proyecto***
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

<div align="center">
  <img src="assets/images/apicon.png" alt="Icono Intranet Ventas" width="96">
</div>

**Intranet Ventas** es la aplicación de escritorio para cajas y puntos de venta de **BOCASIÓN S.A.C.** Permite operar el mostrador, emitir documentos y consultar información de clientes contra la base de datos de la empresa.

Incluye, entre otras funciones

* Emisión de boletas y facturas desde el TPV
* Consulta de DNI / RUC para completar datos del cliente
* Monitor de ventas por caja, liquidación y apertura de caja
* Reportes e impresiones habituales en sede
* Conexión a la base de datos de la empresa o al entorno de pruebas
* Actualizaciones para mantener las cajas al día

<a id="tecnologias"></a>
### Tecnologías
* ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)&nbsp;
* ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)&nbsp;
* ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)&nbsp;
* ![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=electron&logoColor=white)&nbsp;
* ![SQL Server](https://img.shields.io/badge/SQL%20Server-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)&nbsp;
* ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)&nbsp;
* ![Git](https://img.shields.io/badge/GIT-E44C30?style=for-the-badge&logo=git&logoColor=white)&nbsp;
<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

<!-- IMPORTANT NOTICES -->
<a id="avisos-importantes"></a>***Avisos importantes***
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

> [!NOTE]
> Para instalar y usar Intranet Ventas, ten en cuenta lo siguiente
>
> | Requisito | Descripción |
> |-----------|-------------|
> | Sistema operativo | ![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white&color=black) ![Linux](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black&color=black) |
> | Entorno de desarrollo | ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white&color=black) (recomendado 20+) |
> | Base de datos | SQL Server Nava (producción o pruebas) |
> | Red | Internet o red de sede según el entorno elegido |

> [!IMPORTANT]
> En las cajas instaladas la app apunta a la base de datos de **producción**. El entorno de **pruebas** se usa en desarrollo técnico. No compartas el archivo `.env` ni contraseñas en el repositorio.
<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

<!-- GETTING STARTED -->
<a id="primeros-pasos"></a>***Primeros pasos***
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

Instrucciones para configurar el proyecto en local. Sigue estos pasos.

<a id="requisitos"></a>
### Requisitos
* Node.js 20 o superior
* npm
* Acceso a SQL Server (pruebas o producción, según tu `.env`)
* En Linux, para el instalador AppImage, permisos de ejecución

<a id="instalacion"></a>
### Instalación

#### Opción A — Usar el instalador (cajas)
1. Descarga la última versión en [Releases](https://github.com/hexed-AAL1X/Bocasion-TPV/releases)
2. En Windows, ejecuta el instalador `.exe`
3. En Linux, da permisos y abre el AppImage o el script `Intranet-Ventas.sh`

#### Opción B — Desarrollo local
1. Clona el repositorio
   ```sh
   git clone https://github.com/hexed-AAL1X/Bocasion-TPV.git
   ```
2. Entra a la carpeta del proyecto
   ```sh
   cd Bocasion-TPV
   ```
3. Instala dependencias
   ```sh
   npm install
   ```
4. Crea tu `.env` en la raíz (copia la configuración de SQL de pruebas/producción que te indiquen)
5. Arranca en modo desarrollo
   ```sh
   npm run dev
   ```
6. (Opcional) Generar instaladores
   ```sh
   npm run build:win
   # o
   npm run build:desktop
   ```
<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

<!-- CONTRIBUTING -->
<a id="contribuir"></a>***Contribuir***
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

Las contribuciones ayudan a mejorar el proyecto. Si tienes una sugerencia, puedes hacer un fork y abrir un pull request. ¡Gracias por aportar!

1. Haz fork del proyecto
2. Crea una rama para tu mejora (`git checkout -b feature/NuevaMejora`)
3. Confirma tus cambios (`git commit -m "Agrega nueva mejora"`)
4. Sube la rama (`git push origin feature/NuevaMejora`)
5. Abre un pull request
<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

<!-- CONTACT -->
<a id="contacto"></a>***Contacto***
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">
<p align="center">
  <a href="mailto:hexed_aal1x.ops@proton.me"><img src="https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white&color=black" /></a>
  <a href="https://www.instagram.com/hexed_aal1x"><img src="https://img.shields.io/badge/instagram-%2312100E.svg?&style=for-the-badge&logo=instagram&logoColor=white&color=black" /></a>
  <a href="https://www.linkedin.com/in/leonardo-bravo-4120b8228/"><img src="https://img.shields.io/badge/linkedin-%2312100E.svg?&style=for-the-badge&logo=linkedin&logoColor=white&color=black" /></a>
</p>
<p align="right">(<a href="#readme-top">volver arriba</a>)</p>
