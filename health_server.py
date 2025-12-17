#!/usr/bin/env python3
"""
Simple health check server for Railway
Runs alongside the main worker to provide health monitoring
"""

import json
import os
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from src.utils import setup_logging
from loguru import logger


class HealthHandler(BaseHTTPRequestHandler):
    """HTTP handler for health checks"""
    
    def do_GET(self):
        """Handle GET requests"""
        
        if self.path == '/health':
            self.send_health_check()
        elif self.path == '/status':
            self.send_system_status()
        elif self.path == '/trigger':
            self.trigger_generation()
        elif self.path == '/test-api':
            self.test_api_connectivity()
        elif self.path == '/sheets':
            self.get_sheets_url()
        else:
            self.send_404()
    
    def send_health_check(self):
        """Send basic health check response"""
        try:
            response = {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "service": "jachtexamen-blog-worker",
                "environment": os.getenv("ENVIRONMENT", "unknown")
            }
            
            self.send_json_response(200, response)
            
        except Exception as e:
            logger.error(f"Health check error: {e}")
            self.send_json_response(500, {"status": "error", "message": str(e)})
    
    def send_system_status(self):
        """Send detailed system status"""
        try:
            # Check last run status
            last_run_file = "/tmp/last_blog_run.txt"
            last_run = None
            
            if os.path.exists(last_run_file):
                with open(last_run_file, 'r') as f:
                    last_run = f.read().strip()
            
            response = {
                "status": "operational",
                "timestamp": datetime.now().isoformat(),
                "service": "jachtexamen-blog-worker",
                "last_run": last_run,
                "environment": os.getenv("ENVIRONMENT", "development"),
                "run_mode": os.getenv("RAILWAY_RUN_MODE", "once"),
                "posting_frequency": {
                    "min_days": os.getenv("MIN_DAYS_BETWEEN_POSTS", "1"),
                    "max_days": os.getenv("MAX_DAYS_BETWEEN_POSTS", "3")
                }
            }
            
            self.send_json_response(200, response)
            
        except Exception as e:
            logger.error(f"Status check error: {e}")
            self.send_json_response(500, {"status": "error", "message": str(e)})
    
    def send_json_response(self, status_code, data):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response_json = json.dumps(data, indent=2)
        self.wfile.write(response_json.encode())
    
    def trigger_generation(self):
        """Trigger manual article generation"""
        try:
            import asyncio
            import threading
            
            def run_generation():
                """Run generation in background thread"""
                try:
                    # Force update last run file to bypass schedule check
                    import os
                    last_run_file = "/tmp/last_blog_run.txt"
                    if os.path.exists(last_run_file):
                        os.remove(last_run_file)
                    
                    # Import and run the worker
                    from railway_worker import main
                    asyncio.run(main())
                    logger.info("🎉 Manual generation completed!")
                except Exception as e:
                    logger.error(f"💥 Manual generation failed: {e}")
            
            # Start generation in background thread
            thread = threading.Thread(target=run_generation, daemon=True)
            thread.start()
            
            response = {
                "status": "triggered",
                "message": "Article generation started! Check logs for progress.",
                "timestamp": datetime.now().isoformat()
            }
            
            self.send_json_response(200, response)
            logger.info("🚀 Manual article generation triggered via HTTP")
            
        except Exception as e:
            logger.error(f"Trigger error: {e}")
            self.send_json_response(500, {"status": "error", "message": str(e)})
    
    def test_api_connectivity(self):
        """Test API connectivity via HTTP"""
        try:
            import asyncio
            import threading
            
            def run_api_test():
                """Run API test in background thread"""
                try:
                    from src.generator import ContentGenerator
                    generator = ContentGenerator()
                    
                    # Run the connectivity test
                    results = asyncio.run(generator.test_api_connectivity())
                    
                    response = {
                        "status": "tested",
                        "timestamp": datetime.now().isoformat(),
                        "results": results
                    }
                    
                    # Store results temporarily for retrieval
                    with open("/tmp/api_test_results.json", "w") as f:
                        import json
                        json.dump(response, f)
                    
                    logger.info(f"🧪 API connectivity test completed: {results}")
                    
                except Exception as e:
                    logger.error(f"💥 API test failed: {e}")
                    with open("/tmp/api_test_results.json", "w") as f:
                        import json
                        json.dump({"status": "error", "message": str(e)}, f)
            
            # Start test in background thread
            thread = threading.Thread(target=run_api_test, daemon=True)
            thread.start()
            
            response = {
                "status": "testing",
                "message": "API connectivity test started! Check /test-results for results.",
                "timestamp": datetime.now().isoformat()
            }
            
            self.send_json_response(200, response)
            logger.info("🧪 API connectivity test started via HTTP")
            
        except Exception as e:
            logger.error(f"API test trigger error: {e}")
            self.send_json_response(500, {"status": "error", "message": str(e)})
    
    def get_sheets_url(self):
        """Get Google Sheets dashboard URL"""
        try:
            from src.topics import TopicManager
            topic_manager = TopicManager()
            
            sheets_url = topic_manager.get_sheets_url()
            
            if sheets_url:
                response = {
                    "status": "available",
                    "sheets_url": sheets_url,
                    "message": "Click the URL to open your Google Sheets dashboard",
                    "timestamp": datetime.now().isoformat()
                }
            else:
                response = {
                    "status": "not_configured",
                    "message": "Google Sheets integration not configured. Set GOOGLE_SHEETS_ID and credentials.",
                    "timestamp": datetime.now().isoformat()
                }
            
            self.send_json_response(200, response)
            
        except Exception as e:
            logger.error(f"Sheets URL error: {e}")
            self.send_json_response(500, {"status": "error", "message": str(e)})
    
    def send_404(self):
        """Send 404 response"""
        self.send_response(404)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Not Found')
    
    def log_message(self, format, *args):
        """Override default logging to use loguru"""
        logger.info(f"HTTP: {format % args}")


def start_health_server(port=8000):
    """Start the health check server"""
    setup_logging("INFO")
    
    server_address = ('', port)
    httpd = HTTPServer(server_address, HealthHandler)
    
    logger.info(f"🏥 Health server starting on port {port}")
    logger.info(f"📍 Health check: http://localhost:{port}/health")
    logger.info(f"📊 Status check: http://localhost:{port}/status")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("🛑 Health server stopped")
        httpd.shutdown()


if __name__ == "__main__":
    port = int(os.getenv('PORT', 8000))
    start_health_server(port) 