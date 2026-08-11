# Design system MadyPro Clean — état des lieux et cible partagée

Ce document formalise les jetons de design (couleurs, typographie, espacement) utilisés
aujourd'hui par le back-office web et l'app mobile, qui ont évolué séparément, et propose
un socle commun cible. Il ne modifie aucun code — c'est une référence pour aligner
progressivement les deux applications sans les redesigner d'un coup.

## État actuel : deux langages visuels distincts

### Web (`web/src/styles/abstracts/`)
- Couleurs : bleu `#2764ff` (primaire), fond `#f3f4f6`, sidebar `#020617`, texte `#111827` / `#6b7280`
- Typographie : `system-ui` / Inter (sans-serif système)
- Espacement : échelle en px, pas de 4 (`4, 8, 12, 16, 20, 24, 32, 40`)

### Mobile (`madypro-mobile-clean/src/config/theme.ts`)
- Couleurs : teal `#0E8E7C` (primaire), encre `#132420`, crème `#F4F7F5`, sauge `#D3EAE4`
- Typographie : Fjalla One (titres) / Cabin (corps, 4 graisses)
- Espacement : échelle nommée (`xs 4, sm 8, md 12, lg 16, xl 24, xxl 32`)
- Rayons : `pill 999, lg 28, md 20`

Les deux échelles d'espacement sont déjà compatibles (même pas de 4). Les palettes de
couleur et les familles de police, en revanche, ont divergé — le mobile porte l'identité
teal issue de la refonte (Sprint 1), le web est resté sur le bleu d'origine.

## Cible proposée (à adopter progressivement, pas de migration forcée)

L'identité teal du mobile est la plus récente et la plus travaillée (refonte dédiée,
Sprints 1-6) : elle devient la référence pour le socle partagé.

| Rôle | Jeton | Valeur |
|---|---|---|
| Primaire | `color.primary` | `#0E8E7C` |
| Primaire (fond doux) | `color.primarySoft` | `#DFF1EC` |
| Encre (texte fort) | `color.ink` | `#132420` |
| Texte atténué | `color.muted` | `#5C6864` |
| Fond neutre | `color.cream` | `#F4F7F5` |
| Surface | `color.shell` | `#FFFFFF` |
| Bordure | `color.border` | `#D6DEDA` (ex `clay` mobile) |
| Danger | `color.danger` | `#C24A3E` |
| Statut · à l'heure | `color.status.onTime` | `#2E8B57` |
| Statut · en retard | `color.status.late` | `#B9791E` |
| Statut · absent | `color.status.absent` | `#C24A3E` |

| Rôle | Jeton | Valeur |
|---|---|---|
| Police d'affichage | `font.display` | Fjalla One |
| Police de corps | `font.body` | Cabin (400/500/600/700) |
| Police web de repli | `font.webFallback` | system-ui, -apple-system, "Segoe UI", sans-serif |

| Rôle | Jeton | Valeur |
|---|---|---|
| Espacement | `space.xs…xxl` | `4, 8, 12, 16, 24, 32` (px) |
| Rayon petit | `radius.md` | `20` |
| Rayon grand | `radius.lg` | `28` |
| Rayon pilule | `radius.pill` | `999` |

Une version machine-lisible de cette cible est disponible dans
[`design-tokens.json`](./design-tokens.json) à la racine du dépôt, pensée pour être
consommée à terme par les deux applications (ou publiée comme package partagé) sans
qu'aucune des deux n'ait eu besoin d'être retouchée pour ce sprint.

## Pourquoi ne pas migrer maintenant

Retoucher la palette du back-office web en fin de session, sans possibilité de valider
visuellement chaque écran, aurait un risque de régression visuelle élevé pour un gain
non mesurable dans l'immédiat. Ce document sert de point de départ pour un sprint dédié
à la migration progressive (probablement commencer par les composants partagés :
boutons, badges de statut, cartes) plutôt qu'un big-bang.
