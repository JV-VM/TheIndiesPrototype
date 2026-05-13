FROM docker.io/minio/minio:latest

ENTRYPOINT ["minio"]
CMD ["server", "/data", "--address", "0.0.0.0:10000", "--console-address", "0.0.0.0:10001"]
