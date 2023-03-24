import Env from "@ioc:Adonis/Core/Env"
import {BlobServiceClient} from "@azure/storage-blob"
const blobServiceClient = BlobServiceClient.fromConnectionString(Env.get("BLOB_STORAGE_CONNECTION_STRING"));
export const containerClient = blobServiceClient.getContainerClient(Env.get("BLOB_STORAGE_CONTAINER_NAME"));