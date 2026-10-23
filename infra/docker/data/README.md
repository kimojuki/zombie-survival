# Données persistantes Docker (bind mount hôte)

Ce dossier **n'est pas dans Git** (sauf ce README). En prod VM : préférer `ZS_DATA_DIR=/var/lib/zombie-survival`.

| Sous-dossier | Contenu |
|--------------|---------|
| `mariadb/` | BDD complète (joueurs, monde, comptes auth) |
| `backups/` | Dumps SQL horodatés |
| `logs/` | Fichiers log game |

**Jamais** `docker compose down -v` — inutile avec bind mount, mais par habitude en prod.

Mise à jour safe : `./infra/docker/scripts/deploy-vm.sh` (backup auto avant rebuild).
