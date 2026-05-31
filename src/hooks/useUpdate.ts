import { useEffect, useState } from 'react';
import { updateService, type UpdateState } from '@/services/update/UpdateService';

export function useUpdate() {
  const [state, setState] = useState<UpdateState>();

  useEffect(() => updateService.subscribe(setState), []);

  return {
    state,
    applyUpdate: () => updateService.applyNow(),
  };
}
