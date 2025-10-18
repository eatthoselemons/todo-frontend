import PouchDB from 'pouchdb';

/**
 * Document types for type-safe PouchDB operations
 */
export interface BaseDocument {
  _id: string;
  _rev?: string;
  type: string;
}

/**
 * Centralized persistence service for PouchDB operations
 * Eliminates duplication and provides type-safe database access
 */
export class PersistenceService {
  constructor(private db: PouchDB.Database) {}

  /**
   * Save a document, creating or updating as needed
   * Automatically handles 404 errors by creating new documents
   */
  async save<T extends Record<string, any>>(
    docId: string,
    data: T,
    docType: string
  ): Promise<void> {
    try {
      const doc = await this.db.get(docId);
      await this.db.put({
        ...doc,
        ...data,
        _id: docId,
        type: docType,
      });
    } catch (err: any) {
      if (err.status === 404) {
        // Document doesn't exist, create it
        await this.db.put({
          _id: docId,
          ...data,
          type: docType,
        });
      } else {
        throw err;
      }
    }
  }

  /**
   * Load a document with a default fallback
   * If the document doesn't exist, creates it with the default value
   */
  async load<T extends BaseDocument>(
    docId: string,
    defaultValue: T
  ): Promise<T> {
    try {
      return (await this.db.get(docId)) as T;
    } catch (err: any) {
      if (err.status === 404) {
        // Create with default value
        await this.db.put({ ...defaultValue, _id: docId });
        return defaultValue;
      }
      throw err;
    }
  }

  /**
   * Get a document by ID
   * Returns null if not found
   */
  async get<T extends BaseDocument>(docId: string): Promise<T | null> {
    try {
      return (await this.db.get(docId)) as T;
    } catch (err: any) {
      if (err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Delete a document by ID
   */
  async delete(docId: string): Promise<void> {
    try {
      const doc = await this.db.get(docId);
      await this.db.remove(doc);
    } catch (err: any) {
      if (err.status !== 404) {
        throw err;
      }
      // Ignore if already deleted
    }
  }

  /**
   * Update specific fields in a document without replacing the whole thing
   */
  async update<T extends Record<string, any>>(
    docId: string,
    updates: T
  ): Promise<void> {
    const doc = await this.db.get(docId);
    await this.db.put({
      ...doc,
      ...updates,
    });
  }
}
