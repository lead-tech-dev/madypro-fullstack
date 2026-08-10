# MadyPro Clean — Plan de sprints

Découpage en sprints de 2 semaines des deux plans d'amélioration établis en août 2026 :
- **Back-office** (sites, équipes, interventions, pointage, absences, notifications, rapports, paramètres, audit)
- **Mobile** (refonte design + fonctionnel de l'app agent)

Deux pistes en parallèle (back-office / mobile). En solo, alterner ou dérouler une piste à la fois dans l'ordre indiqué — l'ordre au sein de chaque piste reste valable.

Sprints 0-6 : périmètre initial des deux plans, terminés. Sprints 7-16 : backlog initial + fonctionnalités best-in-class supplémentaires, découpés en sprints thématiques.

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

## Sprint 7 (S13-S14) — Sécurité & permissions ✅ terminé

**Back-office**
- [x] Authentification à deux facteurs (2FA) — TOTP (otplib) + QR code (qrcode), setup/confirm/disable, login à deux étapes
- [x] Journal des connexions (qui, quand, depuis où — distinct de l'audit métier) — modèle `LoginEvent`, succès/échec/raison/IP/UA, `GET /auth/login-history`
- [x] Permissions granulaires par rôle — `User.permissions[]`, `PermissionsGuard`/`RequirePermission`, ADMIN bypass, appliqué à `/settings` (ex. supervisor avec `settings:manage`)
- [x] Webhooks sortants pour intégrations personnalisées — CRUD `/webhooks`, dispatch HMAC-SHA256 centralisé dans `RealtimeService.broadcast()`

**Mobile**
- [x] Geste rapide (swipe) pour pointer — composant `SwipeToConfirm` (PanResponder) sur Démarrer/Terminer l'intervention

---

## Sprint 8 (S15-S16) — Équipes avancées ✅ terminé

**Back-office**
- [x] Compétences & habilitations avec alerte d'expiration — `Certification`, `GET /certifications/expiring`
- [x] Documents RH (contrat, badge, permis) — `EmployeeDocument`, fichiers en base64 (convention du projet)
- [x] Échange de shift entre agents — `ShiftSwapRequest`, accept réaffecte réellement l'`InterventionAssignment`, notifie les deux agents
- [x] Fil d'actualité d'équipe — `TeamPost`, lecture pour tous, suppression par l'auteur ou un admin
- [x] Gamification / reconnaissance (badges, agent du mois) — catalogue `Badge` + attributions `UserBadge` (champ `period` pour les récompenses mensuelles), notifie l'agent
- [x] Onboarding checklist pour nouveaux agents — modèle de template + copie par agent, réutilise le pattern checklist existant (site/intervention)
- [ ] UI web back-office pour ces écrans — API uniquement dans cet environnement (pas d'accès pour valider une UI React dans ce sprint), à construire côté `web/` séparément

**Mobile**
- [x] Disponibilités déclarées par l'agent — écran `AgentAvailabilityScreen` (calendrier natif, disponible/indisponible + note), accessible depuis le profil

---

## Sprint 9 (S17-S18) — Absences avancées ✅ terminé

**Back-office**
- [x] Workflow de validation multi-niveaux — absences > 5 jours exigent une validation superviseur (`approve-level1`) avant l'approbation finale, sans changer l'enum de statut existant
- [x] Compteurs de solde de congés automatiques — `LeaveAllocation` par utilisateur/année (25 jours par défaut), solde calculé à partir des congés payés approuvés
- [x] Blocage de dates (périodes de forte activité) — `BlockedPeriod`, toute nouvelle demande chevauchant une période bloquée est rejetée
- [x] Auto-approbation sous conditions (absence courte + solde suffisant) — ≤ 2 jours, et pour les congés payés uniquement si le solde restant suffit
- [ ] UI web back-office pour ces écrans — API uniquement dans ce sprint

---

## Sprint 10 (S19-S20) — Notifications & communication

**Back-office**
- [ ] Templates de notification réutilisables
- [ ] Catégories et priorité visuelle des notifications
- [ ] Envoi différé des notifications
- [ ] Digest quotidien/hebdomadaire consolidé
- [ ] Centre de notifications côté web (équivalent admin du push mobile)
- [ ] Escalade automatique si alerte non lue après un délai

**Mobile**
- [ ] Chat interne agent ↔ superviseur

---

## Sprint 11 (S21-S22) — Sites enrichis

**Back-office**
- [ ] Géofencing configurable par site
- [ ] Contrats/SLA associés au site + alertes d'échéance
- [ ] Score de satisfaction/qualité par site
- [ ] Multi-zones par site (bâtiment A/B, étages)
- [ ] Historique/timeline des incidents par site
- [ ] Plan des locaux avec zones à traiter

---

## Sprint 12 (S23-S24) — Inventaire & interventions avancées

**Back-office**
- [ ] Inventaire de fournitures par site + alerte de réapprovisionnement
- [ ] Suggestion d'affectation par proximité GPS
- [ ] Optimisation de tournées multi-sites
- [ ] Vue carte temps réel des agents sur le terrain
- [ ] Signature client en fin de prestation
- [ ] Estimation de durée basée sur l'historique

**Mobile**
- [ ] Scan code-barres pour l'inventaire de fournitures

---

## Sprint 13 (S25-S26) — Pointage avancé & paie

**Back-office**
- [ ] QR code / badge NFC pour le pointage
- [ ] Règles de majoration fines (nuit, dimanche, jours fériés — au-delà du seuil 35h simple)
- [ ] Intégration paie directe (Payfit/Silae plutôt que CSV)
- [ ] Alerte superviseur sur oubli de pointage (aujourd'hui seul l'agent est notifié)
- [ ] Détection d'anomalies de pointage (durées suspectes, pointages hors zone répétés)

---

## Sprint 14 (S27-S28) — Rapports & business intelligence

**Back-office**
- [ ] Comparaison période sur période (N-1)
- [ ] Dashboard configurable (widgets réarrangeables)
- [ ] Rapport de facturation (heures facturables vs internes)
- [ ] Benchmark inter-sites
- [ ] Export CSV conformité RGPD (audit)
- [ ] Diff avant/après dans l'audit

---

## Sprint 15 (S29-S30) — Plateforme & portail client

**Back-office**
- [ ] Intégrations tierces (calendrier, messagerie)
- [ ] API publique documentée
- [ ] Portail client en lecture seule
- [ ] Devis/facturation liés à l'intervention
- [ ] Formulaires personnalisables (inspections, sécurité)

---

## Sprint 16 (S31-S32) — Mobile approfondi & fondations transverses

**Mobile**
- [ ] Aperçu météo sur l'accueil
- [ ] Widget écran d'accueil (prochaine mission sans ouvrir l'app)

**Transverse**
- [ ] Mode hors-ligne complet (au-delà de la file de synchronisation déjà existante)
- [ ] Design system partagé formalisé entre web et mobile

---

## Hors sprint — initiative stratégique à cadrer séparément

- **Application superviseur dédiée** (aujourd'hui web responsive uniquement, pas d'app native superviseur) — plus gros chantier qu'un sprint, à cadrer à part si prioritaire (périmètre, budget, delai).

---

*Établi à partir des plans « Plan d'amélioration — MadyPro Clean », « Refonte mobile — MadyPro Clean » et des deux listes de fonctionnalités best-in-class (août 2026). À ajuster sprint après sprint selon la vélocité réelle.*
