    }
  }
  
  // Быстрая проверка базового интернет-соединения
  async performQuickInternetCheck() {
    const testServices = [
      { name: 'Google', url: 'https://www.google.com/favicon.ico' },
      { name: 'Cloudflare', url: 'https://1.1.1.1' },
      { name: 'GitHub', url: 'https://api.github.com' }
    ];
    
    let workingServices = 0;
    const results = [];
    
    for (const service of testServices) {
      try {
        const response = await Promise.race([
          fetch(service.url, { 
            method: 'HEAD', 
            mode: 'no-cors',
