# Maintenance

## Atualizar regras e índices do Firestore

Depois de editar `firestore.rules` e `firestore.indexes.json`:

```bash
npm run update-firestore
```

## Scripts de migração

```bash
npm run migrate-deleted-at
npm run migrate-signer-emails
npm run remove-activity-description
```

## Outros scripts úteis

```bash
npm run typecheck
npm run pull-firestore-rules
```
