/* Static settings controls use one delegated event surface. Dynamic list actions remain owned by app-settings.js. */
(function(){
  const actions={
    'toggle-theme':()=>window.toggleTheme?.(),
    'add-center':()=>window.addCenter?.(),
    'add-type':()=>window.addType?.(),
    'add-brand':()=>window.addBrand?.(),
    'add-part-category':()=>window.addPartCategory?.(),
    'backup':()=>window.backupAllData?.(),
    'integrity':()=>window.runDataIntegrityCheck?.(),
    'audit-refresh':()=>window.renderAuditLog?.(),
    'delete-customers':()=>window.deleteAllCustomers?.(),
    'delete-devices':()=>window.deleteAllDevices?.(),
    'delete-requests':()=>window.deleteAllRequests?.(),
    'delete-operational':()=>window.deleteAllOperationalData?.(),
    'pin-set':()=>window.setAppPin?.(),
    'pin-change':()=>window.changeAppPin?.(),
    'pin-remove':()=>window.removeAppPin?.()
  };
  document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;const fn=actions[el.dataset.action];if(fn)fn()});
  document.addEventListener('change',e=>{const el=e.target.closest('[data-action="restore-backup"]');if(el&&el.files?.[0])window.restoreBackupFile?.(el)});
})();
