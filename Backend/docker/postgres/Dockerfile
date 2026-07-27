FROM postgres:16-alpine

# Create log directory with correct permissions
RUN mkdir -p /var/log/postgresql && chown postgres:postgres /var/log/postgresql

# Copy custom config that enables pgBadger-compatible logging
COPY postgresql.conf /etc/postgresql/pgbadger.conf

# Init scripts run on a FRESH data directory only (creates the civil_app role).
# Existing databases are provisioned via deploy/provision-db-role.sql — see SECURITY.md.
COPY init/ /docker-entrypoint-initdb.d/
RUN chmod +x /docker-entrypoint-initdb.d/*.sh
