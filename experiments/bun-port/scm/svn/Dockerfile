FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends apache2 apache2-utils libapache2-mod-svn subversion \
    && a2enmod dav dav_svn authz_svn \
    && rm -rf /var/lib/apt/lists/*

COPY dav.conf /etc/apache2/sites-available/000-default.conf

EXPOSE 80
ENTRYPOINT ["/bin/sh", "-c", "set -eu; printf '%s\\n' \"$BUN_SVN_PASSWORD\" | htpasswd -i -B -c /etc/apache2/svn.passwd \"$BUN_SVN_USER\"; chmod -R a+rwX /repos; exec apachectl -D FOREGROUND"]
