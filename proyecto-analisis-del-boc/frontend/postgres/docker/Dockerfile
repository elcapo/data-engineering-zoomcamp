FROM postgres:18

COPY scripts/* /usr/local/bin/

RUN chmod +x /usr/local/bin/create-bundle
RUN chmod +x /usr/local/bin/create-database
RUN chmod +x /usr/local/bin/create-user
RUN chmod +x /usr/local/bin/drop-bundle
RUN chmod +x /usr/local/bin/drop-database
RUN chmod +x /usr/local/bin/drop-user
RUN chmod +x /usr/local/bin/dump-database
RUN chmod +x /usr/local/bin/link-database-and-user
RUN chmod +x /usr/local/bin/restore-database
RUN chmod +x /usr/local/bin/set-admin
