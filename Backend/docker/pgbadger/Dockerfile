FROM alpine:3.20

RUN apk add --no-cache perl pgbadger dcron bash

# Report output directory
RUN mkdir -p /var/www/pgbadger && chmod 755 /var/www/pgbadger

# Cron script to generate pgBadger reports
COPY generate-report.sh /usr/local/bin/generate-report.sh
RUN chmod +x /usr/local/bin/generate-report.sh

# Crontab: generate report every hour + a daily full report at midnight
COPY crontab /etc/crontabs/root

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
CMD ["crond", "-f", "-l", "2"]
