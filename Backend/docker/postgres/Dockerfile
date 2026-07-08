FROM postgres:16-alpine

# Create log directory with correct permissions
RUN mkdir -p /var/log/postgresql && chown postgres:postgres /var/log/postgresql

# Copy custom config that enables pgBadger-compatible logging
COPY postgresql.conf /etc/postgresql/pgbadger.conf
