import { Firestore } from '@google-cloud/firestore';

export interface AlertState {
  deviceId: string;
  dedupKey: string;
  lastAlertTime: number;
  isActive: boolean;
  humidityLevel: number;
  threshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export class FirestoreClient {
  private firestore: Firestore;
  private readonly COLLECTION = 'humidity-alerts';

  constructor() {
    this.firestore = new Firestore();
  }

  async getAlertState(deviceId: string): Promise<AlertState | null> {
    try {
      const doc = await this.firestore
        .collection(this.COLLECTION)
        .doc(deviceId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as AlertState;
    } catch (error) {
      console.error('Error getting alert state:', error);
      return null;
    }
  }

  async setAlertState(alertState: AlertState): Promise<void> {
    try {
      await this.firestore
        .collection(this.COLLECTION)
        .doc(alertState.deviceId)
        .set({
          ...alertState,
          updatedAt: new Date()
        });
    } catch (error) {
      console.error('Error setting alert state:', error);
      throw error;
    }
  }

  async updateAlertState(deviceId: string, updates: Partial<AlertState>): Promise<void> {
    try {
      await this.firestore
        .collection(this.COLLECTION)
        .doc(deviceId)
        .update({
          ...updates,
          updatedAt: new Date()
        });
    } catch (error) {
      console.error('Error updating alert state:', error);
      throw error;
    }
  }

  async deleteAlertState(deviceId: string): Promise<void> {
    try {
      await this.firestore
        .collection(this.COLLECTION)
        .doc(deviceId)
        .delete();
    } catch (error) {
      console.error('Error deleting alert state:', error);
      throw error;
    }
  }

  async getAllActiveAlerts(): Promise<AlertState[]> {
    try {
      const snapshot = await this.firestore
        .collection(this.COLLECTION)
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map(doc => doc.data() as AlertState);
    } catch (error) {
      console.error('Error getting active alerts:', error);
      return [];
    }
  }
}