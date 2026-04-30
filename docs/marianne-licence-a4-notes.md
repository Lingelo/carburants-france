# A4 — Marianne (Etalab 2.0) licence review notes

**But du document** : exécuter l'action **A4 Pre-work** du plan `docs/plans/2026-04-30-001-feat-ui-redesign-service-public-plan.md` — vérifier que la licence Etalab 2.0 sous laquelle DINUM distribue la typographie Marianne est compatible avec un side-project hors champ administratif.

⚠️ **Ce document est un draft basé sur la connaissance générale de la licence Etalab 2.0 et des conventions de distribution Marianne par DINUM. L'utilisateur doit valider chaque point en lisant le texte authentique de la licence avant figeage de R3 dans le code.**

Sources à consulter pour validation finale :
- Texte de la licence Etalab 2.0 : https://github.com/etalab/licence-ouverte/blob/master/LO.md (équivalent à l'Open Licence v2.0 anglaise)
- Page de distribution Marianne DSFR : https://www.systeme-de-design.gouv.fr/fondamentaux/typographie/
- Page Wikipédia Marianne (typo) si applicable

---

## Les 5 critères du plan

### 1. Usage commercial autorisé ?

**Draft réponse : OUI, autorisé sans restriction commerciale.**

L'Open Licence Etalab 2.0 (équivalente CC-BY 2.0 / ODC-BY) **permet explicitement la réutilisation à toutes fins, y compris commerciales**, sans restriction sur le type d'utilisation.

⚠️ À vérifier dans le texte : la clause « Liberté de réutilisation » mentionne « à toutes fins » sans réserve commerciale.

**Implication pour `carburants-france`** : un side-project perso, même s'il évolue vers un usage générant des revenus (ads, partenariats), reste dans le scope autorisé.

---

### 2. Clauses pastiche / identité ?

**Draft réponse : NON, pas de clause pastiche dans la licence Etalab 2.0 elle-même. MAIS attention aux signes officiels de l'État, qui sont protégés par d'autres règles que la licence de la typo.**

La licence Etalab 2.0 ne contient aucune clause de protection d'identité ou anti-pastiche. La **typo Marianne** seule est un actif graphique réutilisable.

⚠️ À vérifier : aucune mention de « identité visuelle » ou « confusion » dans le texte de la licence.

**MAIS** — distinct de la licence — la **charte graphique de l'État** protège :
- Le **bloc-marque Marianne** (logo « RÉPUBLIQUE FRANÇAISE » avec drapeau bleu-blanc-rouge)
- La **cocarde tricolore**
- Des **combinaisons spécifiques** typo Marianne + bleu Marianne + drapeau qui peuvent créer une confusion avec un site officiel `.gouv.fr`

C'est exactement ce que les **garde-fous anti-pastiche** du brainstorm visent (cf `docs/brainstorms/ui-redesign-service-public-requirements.md`, section Dependencies / Assumptions, garde-fous 1-4). Ces garde-fous ne sont **pas une obligation légale** stricte mais une **précaution d'usage** qui protège l'utilisateur final de la confusion.

**Implication pour `carburants-france`** : utiliser la typo Marianne ≠ usurper un signe officiel. L'usage est légitime si on évite le bloc-marque + la cocarde + les combinaisons trop proches d'un site `.gouv.fr`. Le footer R8 « Site indépendant — non affilié à l'État français » et le test pastiche à 2 axes couvrent le risque pratique.

---

### 3. Attribution requise ?

**Draft réponse : OUI, l'attribution (paternité) est requise.**

L'Open Licence Etalab 2.0 impose une obligation d'attribution. La phrase classique demandée : mention de la source (« Marianne, typographie de la République française », ou « © DINUM ») et idéalement un lien vers la source d'origine.

⚠️ À vérifier dans le texte : clause « Conditions de réutilisation » qui exige « la mention de la paternité ».

**Implication pour `carburants-france`** : ajouter une mention de l'origine de Marianne dans :
- Le footer (à côté du disclaimer R8 ou juste en-dessous), par exemple : « Typographie : Marianne (DINUM, Licence Ouverte 2.0) »
- OU dans la modale À propos (`src/components/AboutModal.tsx`), section « Crédits / Sources »

Format suggéré (à valider en U6 ou U10 du plan) :
```
Typographie : Marianne — typographie de la République française
Distribuée par DINUM sous Licence Ouverte 2.0 (Etalab)
```

**Cette obligation d'attribution n'avait pas été explicitée dans le plan** — à ajouter comme sous-bullet de R8 ou R10 lors de l'exécution.

---

### 4. Restriction de format ou d'embarquement ?

**Draft réponse : NON, aucune restriction de format.**

L'Open Licence Etalab 2.0 ne restreint pas les formats de fichier ni les modes de distribution. La typo Marianne peut être self-hostée en `.woff2`, `.woff`, `.ttf`, `.otf` indifféremment.

⚠️ À vérifier dans la doc DSFR : si DINUM publie uniquement certains formats (typiquement `.woff2`), c'est par convention, pas par obligation légale.

**Implication pour `carburants-france`** : self-host des `.woff2` dans `public/fonts/` est OK. Pas besoin de garder un format particulier.

---

### 5. Combinaison avec d'autres polices / fonts permise ?

**Draft réponse : OUI, aucune restriction sur la combinaison avec d'autres typographies.**

La licence Etalab 2.0 est une licence **non-copyleft** (pas de clause share-alike). Combiner Marianne avec Inter (fallback runtime du plan) ne crée aucune contamination de licence ni obligation d'aligner les autres typos sur Etalab 2.0.

⚠️ À vérifier dans le texte : absence de clause « œuvres dérivées » ou « partage à l'identique ».

**Implication pour `carburants-france`** : R3 du plan (Marianne primaire + Inter fallback) est compatible avec la licence Marianne. Inter reste sous sa propre licence (SIL Open Font License 1.1) sans contagion.

---

## Verdict provisoire (à confirmer par l'utilisateur)

Sur la base de ce draft :

| Critère | Verdict | Confiance |
|---------|---------|-----------|
| Usage commercial | ✅ OK | Haute |
| Pastiche/identité | ✅ OK avec garde-fous brainstorm | Haute |
| Attribution | ✅ OK, mais **à ajouter au plan** comme sous-bullet R8/R10 | Haute |
| Format | ✅ OK, .woff2 self-host autorisé | Haute |
| Combinaison fonts | ✅ OK, Inter fallback compatible | Haute |

**Conclusion provisoire** : R3 (Marianne en P1) peut procéder. Aucune restriction bloquante identifiée. **Une seule action à intégrer au plan** : ajouter la mention d'attribution Marianne dans le footer R8 ou la modale À propos.

## Action à confirmer par l'utilisateur

1. **Lire le texte complet** de l'Open Licence 2.0 (lien ci-dessus, ~30 min) pour valider les 5 réponses ci-dessus
2. **Décider du placement** de l'attribution Marianne : footer R8 (visible en permanence) ou modale À propos (cachée par défaut). Recommandation : modale À propos pour ne pas alourdir le footer
3. **Mettre à jour le plan** : ajouter un sous-bullet à R8 ou R10 mentionnant l'attribution Marianne
4. **Si désaccord avec un verdict ci-dessus** : revenir au brainstorm pour ajuster R3 (bascule Inter en P1, par exemple)

## Si A4 invalide R3

Plan B documenté dans le brainstorm : **R3 bascule sur Inter en P1**, Marianne supprimée. Cela invalide aussi U5 (la stratégie de chargement self-host change), R7 wordmark (peut rester en Inter), et le test pastiche (le risque de confusion gouv.fr diminue mais ne disparaît pas — bleu Marianne `#000091` reste un signal).
