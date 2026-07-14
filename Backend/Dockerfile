# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: install PHP dependencies with Composer (no dev deps, no app code
# needed yet — this stage is cached as long as composer.json/lock don't change)
# =============================================================================
FROM composer:2 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --ignore-platform-reqs \
    --prefer-dist

COPY . .

RUN composer dump-autoload --optimize --no-dev

# =============================================================================
# Stage 2: runtime image — PHP-FPM + Nginx + Supervisor in one container.
# (Simplest single-container deploy for Server 3; swap for separate
# php-fpm/nginx containers behind a load balancer if you outgrow one droplet.)
# =============================================================================
FROM php:8.3-fpm-alpine AS app

# --- System packages -----------------------------------------------------
RUN apk add --no-cache \
    nginx \
    supervisor \
    bash \
    curl \
    git \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    postgresql-dev \
    autoconf \
    g++ \
    make \
    pkgconfig

# --- PHP extensions --------------------------------------------------------
# pdo_pgsql   -> PostgreSQL (Server 4, the primary DB)
# redis       -> cache/session/queue driver (Server 2)
# mongodb     -> MongoDB (Server 5, secondary DB)
RUN docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install -j$(nproc) pdo_pgsql pgsql gd zip bcmath intl opcache \
    && pecl install redis \
    && docker-php-ext-enable redis

# MongoDB extension — install from Alpine package to avoid 10+ min PECL compile
RUN apk add --no-cache php83-pecl-mongodb \
    && cp /usr/lib/php83/modules/mongodb.so "$(php -r 'echo ini_get("extension_dir");')/" \
    && docker-php-ext-enable mongodb

WORKDIR /var/www/html

# --- App code + vendor from the build stage --------------------------------
COPY --from=vendor /app ./

# --- Runtime configuration ---------------------------------------------------
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/99-app.ini
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# --- Permissions: Laravel needs to write to storage/ and bootstrap/cache/ --
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80

ENTRYPOINT ["entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf", "-n"]
