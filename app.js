const express = require("express"),
  cors = require("cors");
const Config = require("./config/Config");
const Database = require("./db");
const UserRepository = require("./repositories/UserRepository");
const DocumentRepository = require("./repositories/DocumentRepository");
const PasswordService = require("./services/PasswordService");
const TokenService = require("./services/TokenService");
const AuthService = require("./services/AuthService");
const DocumentService = require("./services/DocumentService");
const FeatureService = require("./services/FeatureService");
const AuthController = require("./controllers/AuthController");
const DocumentController = require("./controllers/DocumentController");
const FeatureController = require("./controllers/FeatureController");
const AuthMiddleware = require("./middleware/auth");
const UploadMiddleware = require("./middleware/upload");
const ErrorHandler = require("./middleware/errorHandler");
const FileStorage = require("./utils/FileStorage");
const authRoutes = require("./routes/authRoutes"),
  documentRoutes = require("./routes/documentRoutes"),
  featureRoutes = require("./routes/featureRoutes");
class App {
  constructor(db) {
    this.db = db;
    this.express = express();
    this.userRepository = new UserRepository(db);
    this.documentRepository = new DocumentRepository(db);
    const storage = new FileStorage(Config.uploadDir),
      token = new TokenService(Config.jwtSecret);
    this.authService = new AuthService(
      this.userRepository,
      new PasswordService(),
      token,
    );
    this.documentService = new DocumentService(
      this.documentRepository,
      storage,
    );
    this.featureService = new FeatureService(db);
    this.authController = new AuthController(this.authService);
    this.documentController = new DocumentController(
      this.documentService,
      this.documentRepository,
    );
    this.featureController = new FeatureController(this.featureService);
    this.authMiddleware = new AuthMiddleware(token);
    this.uploadMiddleware = new UploadMiddleware({
      dir: Config.uploadDir,
      allowedExtensions: Config.allowedExtensions,
      maxFileSize: Config.maxFileSize,
    });
    this.setup();
  }
  setup() {
    this.express.use(cors());
    this.express.use(express.json());
    this.express.use("/api/auth", authRoutes(this.authController));
    this.express.use(
      "/api/documents",
      documentRoutes(
        this.documentController,
        this.authMiddleware,
        this.uploadMiddleware,
      ),
    );
    this.express.use(
      "/api/features",
      featureRoutes(this.featureController, this.authMiddleware),
    );
    this.express.use("/uploads", express.static(Config.uploadDir));
    this.express.use(express.static(Config.frontendDir));
    this.express.get("/api/health", (req, res) =>
      res.json({ ok: true, database: "mysql" }),
    );
    this.express.use("/api", ErrorHandler.notFound);
    this.express.use(ErrorHandler.handle);
  }
}
module.exports = App;
