export interface InternalNotification {
  orgId: string;
  message: string;
  href: string;
  senderId: string;
  recipientId: string;
  actor?: {
    id: string;
    type: string;
  };
  target?: {
    id: string;
    type: string;
  };
}

