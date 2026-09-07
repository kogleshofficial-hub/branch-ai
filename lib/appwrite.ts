import { Client, Account } from 'appwrite'

const client = new Client()
client.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
client.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a9e762d0010330e51cf')

export const account = new Account(client)
