export type WSMessageType = 
  | 'FULL_STATE' | 'NODE_ADDED' | 'NODE_REMOVED' 
  | 'NODE_STATUS_CHANGED' | 'EDGE_ADDED' | 'EDGE_REMOVED'
  | 'PHASE_CHANGED' | 'STATE_CHANGED';

export interface WSMessage {
  type: WSMessageType;
  payload: any;
}
