# MadyPro Clean — Plan de sprints

Découpage en sprints de 2 semaines des deux plans d'amélioration établis en août 2026 :
- **Back-office** (sites, équipes, interventions, pointage, absences, notifications, rapports, paramètres, audit)
- **Mobile** (refonte design + fonctionnel de l'app agent)

Deux pistes en parallèle (back-office / mobile). En solo, alterner ou dérouler une piste à la fois dans l'ordre indiqué — l'ordre au sein de chaque piste reste valable.

Les items « Basse priorité / Long terme » des deux plans sont laissés en backlog non sprinté (fin de document) : à re-prioriser une fois les sprints 0-6 réalisés.

---

## Sprint 0 — Cadrage (3 à 5 jours, avant tout le reste)

Bloquant : les changements de schéma en cours cassent déjà `/reports/summary` en production de fait (corrigé une fois), et laissent des résidus ailleurs.

- [ ] **Trancher le retrait du modèle `Client`** — suppression définitive ou remplacement ? Décision à documenter.
- [ ] Nettoyer les résidus : module `clients` backend orphelin, filtre `clientId` mort dans `interventions.controller.ts`, page `ClientsPage` côté web.
- [ ] Corriger `/reports/performance` — actuellement des données codées en dur (`reports.service.ts`), pas de vraie requête Prisma.

---

## Sprint 1 (S1-S2)

**Back-office**
- [ ] Détection de conflits d'affectation (un agent sur deux interventions qui se chevauchent, ou en absence validée)
- [ ] Élargir la couverture du journal d'audit (créations/suppressions/changements de statut sur users, interventions, absences, pointages)

**Mobile**
- [ ] Design tokens (couleurs, typographie) — palette teal proposée + embarquer Fjalla One / Cabin via `@expo-google-fonts`
- [ ] Refactor `AgentInterventionScreen.tsx` (1320 lignes) en sous-composants : minuteur, formulaire d'anomalie, liste d'agents

---

## Sprint 2 (S3-S4)

**Back-office**
- [ ] Photo obligatoire au check-in / check-out
- [ ] Alerte superviseur en temps réel (exposer les vérifications de retard déjà calculées côté backend comme notification push)

**Mobile**
- [ ] Composants de base sur les nouveaux tokens : bouton, carte, pastille de statut
- [ ] Appliquer le nouveau design à l'écran Accueil — une seule action mise en avant selon le moment (arrivée à venir / mission en cours / rien de prévu)

---

## Sprint 3 (S5-S6)

**Back-office**
- [ ] Fiche site enrichie (photos, instructions d'accès, codes, contact sur place)
- [ ] Cahier des charges / checklist par site (modèle de prestation réutilisable)

**Mobile**
- [ ] Appliquer le nouveau design à l'écran Intervention / Pointage
- [ ] Photo de fin de mission intégrée au flux normal (pas seulement via « signaler un problème »)

---

## Sprint 4 (S7-S8)

**Back-office**
- [ ] Checklist qualité par intervention (s'appuie sur le cahier des charges du sprint 3)
- [ ] Suggestion de remplaçant sur absence validée
- [ ] Pièces justificatives sur les demandes d'absence

**Mobile**
- [ ] Tab bar redessinée (chrome sombre, cf. maquette)
- [ ] Indicateur de synchronisation discret sur l'accueil (remplace la recherche active de `AgentSyncQueueScreen`)

---

## Sprint 5 (S9-S10)

**Back-office**
- [ ] Export paie (heures normales/majorées par agent)
- [ ] Accusé de lecture sur les notifications

**Mobile**
- [ ] Calendrier visuel pour les demandes d'absence
- [ ] Aperçu riche dans les notifications push (site, horaire visibles sans ouvrir l'app)

---

## Sprint 6 (S11-S12)

**Back-office**
- [ ] Export PDF/Excel des rapports + envoi programmé (hebdo/mensuel par e-mail — SendGrid déjà intégré)
- [ ] KPIs avancés (ponctualité, absentéisme, heures réalisées vs planifiées)
- [ ] Surcharge des règles de pointage par site

**Mobile**
- [ ] Vue planning glisser-déposer côté back-office *(dépendance croisée — voir back-office Sprint 3/4 si priorité change)*
- [ ] Stabilisation, tests sur device réel, correctifs

---

## Backlog (Basse priorité / long terme — non sprinté)

**Back-office**
- Géofencing configurable par site
- Portail client en lecture seule
- Fil d'actualité d'équipe, reconnaissance
- Documents RH (contrat, badge, permis)
- Suggestion d'affectation par proximité GPS
- QR code / badge NFC pour le pointage
- Compteurs de solde de congés automatiques
- Catégories et priorité visuelle des notifications
- Envoi différé des notifications
- Permissions granulaires par rôle
- Intégrations tierces (paie, calendrier, messagerie)
- Diff avant/après dans l'audit

**Mobile**
- Geste rapide (swipe) pour pointer
- Aperçu météo sur l'accueil
- Cadrage d'une éventuelle vue superviseur mobile

**Transverse**
- Mode hors-ligne complet (au-delà de la file de synchronisation déjà existante côté mobile)
- Design system partagé formalisé entre web et mobile

---

*Établi à partir des plans « Plan d'amélioration — MadyPro Clean » et « Refonte mobile — MadyPro Clean » (août 2026). À ajuster sprint après sprint selon la vélocité réelle.*
