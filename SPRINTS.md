# MadyPro Clean — Plan de sprints

Découpage en sprints de 2 semaines des deux plans d'amélioration établis en août 2026 :
- **Back-office** (sites, équipes, interventions, pointage, absences, notifications, rapports, paramètres, audit)
- **Mobile** (refonte design + fonctionnel de l'app agent)

Deux pistes en parallèle (back-office / mobile). En solo, alterner ou dérouler une piste à la fois dans l'ordre indiqué — l'ordre au sein de chaque piste reste valable.

Les items « Basse priorité / Long terme » des deux plans sont laissés en backlog non sprinté (fin de document) : à re-prioriser une fois les sprints 0-6 réalisés.

---

## Sprint 0 — Cadrage ✅ terminé

- [x] **Trancher le retrait du modèle `Client`** — suppression définitive actée, migration appliquée.
- [x] Nettoyer les résidus : module `clients` backend, filtre `clientId` mort, page `ClientsPage` web.
- [x] Corriger `/reports/performance` — vraies requêtes Prisma.

---

## Sprint 1 (S1-S2) ✅ terminé

**Back-office**
- [x] Détection de conflits d'affectation
- [x] Élargir la couverture du journal d'audit (+ persistance en base, ne vivait qu'en mémoire)

**Mobile**
- [x] Design tokens (palette teal + Fjalla One / Cabin)
- [x] Refactor `AgentInterventionScreen.tsx` en sous-composants

---

## Sprint 2 (S3-S4) ✅ terminé

**Back-office**
- [x] Photo obligatoire au check-in / check-out
- [x] Alerte superviseur en temps réel

**Mobile**
- [x] Composants de base (Card, StatusPill) sur les nouveaux tokens
- [x] Nouveau design sur l'écran Accueil (action prioritaire mise en avant)

---

## Sprint 3 (S5-S6) ✅ terminé

**Back-office**
- [x] Fiche site enrichie (instructions d'accès, code, contact, photos)
- [x] Cahier des charges / checklist par site

**Mobile**
- [x] Nouveau design sur l'écran Intervention / Pointage
- [x] Photo de fin de mission intégrée au flux normal (check-in + check-out)

---

## Sprint 4 (S7-S8) ✅ terminé

**Back-office**
- [x] Checklist qualité par intervention (copiée depuis le cahier des charges du site)
- [x] Suggestion de remplaçant sur absence validée
- [x] Pièces justificatives sur les demandes d'absence

**Mobile**
- [x] Tab bar redessinée (chrome sombre)
- [x] Indicateur de synchronisation discret sur l'accueil

---

## Sprint 5 (S9-S10) ✅ terminé

**Back-office**
- [x] Export paie CSV (heures normales/majorées, seuil 35h/semaine)
- [x] Accusé de lecture sur les notifications

**Mobile**
- [x] Calendrier visuel (DateTimePicker natif) pour les demandes d'absence
- [x] Aperçu riche dans les notifications push (site + horaire corrigés)

---

## Sprint 6 (S11-S12) ✅ terminé

**Back-office**
- [x] Export + envoi programmé par e-mail (hebdo lundi / mensuel le 1er, CSV joint) — SendGrid du compte actuel en quota épuisé, à surveiller
- [x] KPIs avancés (ponctualité, absentéisme, réalisation)
- [x] Surcharge des règles de pointage par site

**Mobile**
- [x] Vue planning — implémentée côté web (page superviseur réutilisée, ouverte aux admins) plutôt qu'un glisser-déposer dédié
- [ ] Stabilisation sur device réel — non réalisable dans cet environnement (pas de simulateur/device), à faire manuellement

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
