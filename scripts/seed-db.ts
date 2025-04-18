/**
 * Seed database with initial data for local development
 */
import { db } from "../server/db";
import { 
  users, teams, teamMembers, channels, conversations, 
  conversationParticipants, messages, documents,
  institutions, codingEnvironments
} from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Function to hash password with salt (copied from auth.ts)
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  console.log("Seeding database with initial data...");
  
  try {
    // Create a sample institution
    const institution = await db.insert(institutions).values({
      name: "Sample University",
      address: "123 University St, City, State",
      contactEmail: "contact@sampleuniversity.edu",
      contactPhone: "555-123-4567",
      website: "https://sampleuniversity.edu"
    }).returning();
    
    console.log(`Created institution: ${institution[0].name}`);
    
    // Create a sample admin user
    const adminPassword = await hashPassword("adminpass");
    const adminUser = await db.insert(users).values({
      username: "admin",
      password: adminPassword,
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      status: "available",
      institutionId: institution[0].id
    }).returning();
    
    console.log(`Created admin user: ${adminUser[0].username}`);
    
    // Create a sample teacher
    const teacherPassword = await hashPassword("teacherpass");
    const teacherUser = await db.insert(users).values({
      username: "teacher",
      password: teacherPassword,
      name: "Teacher User",
      email: "teacher@example.com",
      role: "teacher",
      status: "available",
      institutionId: institution[0].id
    }).returning();
    
    console.log(`Created teacher user: ${teacherUser[0].username}`);
    
    // Create sample students
    const student1Password = await hashPassword("student1pass");
    const student1 = await db.insert(users).values({
      username: "student1",
      password: student1Password,
      name: "Student One",
      email: "student1@example.com",
      role: "student",
      status: "available",
      institutionId: institution[0].id
    }).returning();
    
    console.log(`Created student user: ${student1[0].username}`);
    
    const student2Password = await hashPassword("student2pass");
    const student2 = await db.insert(users).values({
      username: "student2",
      password: student2Password,
      name: "Student Two",
      email: "student2@example.com",
      role: "student",
      status: "busy",
      institutionId: institution[0].id
    }).returning();
    
    console.log(`Created student user: ${student2[0].username}`);
    
    // Create a test user with simple credentials for testing
    const testPassword = await hashPassword("password123");
    const testUser = await db.insert(users).values({
      username: "testuser",
      password: testPassword,
      name: "Test User",
      email: "test@example.com",
      role: "student",
      status: "available",
      institutionId: institution[0].id
    }).returning();
    
    console.log(`Created test user: ${testUser[0].username}`);
    
    // Create a sample team
    const team = await db.insert(teams).values({
      name: "Sample Team",
      description: "A sample team for demonstration purposes",
      ownerId: adminUser[0].id
    }).returning();
    
    console.log(`Created team: ${team[0].name}`);
    
    // Add team members
    await db.insert(teamMembers).values({
      teamId: team[0].id,
      userId: adminUser[0].id,
      role: "owner"
    });
    
    await db.insert(teamMembers).values({
      teamId: team[0].id,
      userId: teacherUser[0].id,
      role: "admin"
    });
    
    await db.insert(teamMembers).values({
      teamId: team[0].id,
      userId: student1[0].id,
      role: "member"
    });
    
    await db.insert(teamMembers).values({
      teamId: team[0].id,
      userId: student2[0].id,
      role: "member"
    });
    
    // Create sample channels
    const generalChannel = await db.insert(channels).values({
      teamId: team[0].id,
      name: "general",
      description: "General discussions"
    }).returning();
    
    console.log(`Created channel: ${generalChannel[0].name}`);
    
    const homeworkChannel = await db.insert(channels).values({
      teamId: team[0].id,
      name: "homework",
      description: "Homework discussions and submissions"
    }).returning();
    
    console.log(`Created channel: ${homeworkChannel[0].name}`);
    
    // Create a direct message conversation
    const conversation = await db.insert(conversations).values({
      name: null,
      isGroup: false,
      type: "direct",
      createdBy: teacherUser[0].id
    }).returning();
    
    // Add participants to the conversation
    await db.insert(conversationParticipants).values({
      conversationId: conversation[0].id,
      userId: teacherUser[0].id
    });
    
    await db.insert(conversationParticipants).values({
      conversationId: conversation[0].id,
      userId: student1[0].id
    });
    
    // Add some messages
    await db.insert(messages).values({
      conversationId: conversation[0].id,
      userId: teacherUser[0].id,
      content: "Hello, how is your project coming along?"
    });
    
    await db.insert(messages).values({
      conversationId: conversation[0].id,
      userId: student1[0].id,
      content: "I've made good progress on it. Should be done by Friday."
    });
    
    // Create a sample document
    await db.insert(documents).values({
      name: "Course Overview",
      type: "word",
      content: "# Course Overview\n\nThis document provides an overview of the course curriculum and expectations.\n\n## Objectives\n\n- Understand key concepts\n- Complete practical exercises\n- Collaborate with team members",
      ownerId: teacherUser[0].id,
      department: "Computer Science"
    });
    
    // Create a coding environment
    await db.insert(codingEnvironments).values({
      userId: adminUser[0].id,
      language: "javascript",
      code: "// Sample JavaScript code\nconsole.log('Hello, world!');\n\nfunction add(a, b) {\n  return a + b;\n}\n\nconst result = add(5, 7);\nconsole.log(`5 + 7 = ${result}`);",
      name: "JavaScript Basics",
      type: "custom",
      isPublic: true
    });
    
    console.log("Database seeded successfully!");
    console.log("\nYou can now log in with the following credentials:");
    console.log("Username: testuser");
    console.log("Password: password123");
    
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

main().catch(console.error);