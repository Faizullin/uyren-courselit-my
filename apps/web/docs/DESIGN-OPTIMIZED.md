# LMS Platform - Optimized Route Structure

## Overview

Optimized route structure using dialogs, slide-overs, and tabs for better UX.

**Total Routes: 45+** (optimized with dialogs and tabs)

---

## 📊 Summary

| Section | Routes | Description |
|---------|--------|-------------|
| Public Routes | 10 | Marketing, course catalog, authentication |
| Student Dashboard | 12 | Learning interface, assignments, schedule, progress |
| Instructor Dashboard | 15 | Course creation, grading, analytics, themes |
| Admin Dashboard | 9 | User management, platform settings, studio |
| Other | 3 | Instructor landing, profile, notifications |

---

## 🌐 Public Routes (10)

### 1. `/` - Landing Page
**Purpose:** Marketing homepage for visitors
**Features:**
- Hero section with main value proposition
- Featured courses showcase
- Instructor highlights
- Student testimonials
- Course categories grid
- Platform statistics (students, courses, ratings)
- Call-to-action buttons (Sign up, Browse courses)
- Footer with quick links

**Actions:**
- *Dialog:* Quick course preview on hover
- *Navigation:* Browse courses, Login/Register

---

### 2. `/courses` - Course Catalog
**Purpose:** Browse and search all available courses
**Features:**
- Course grid/list view toggle
- **Filters:**
  - Category (Development, Business, Design, etc.)
  - Level (Beginner, Intermediate, Advanced)
  - Price (Free, Paid, Price range)
  - Duration (Hours/Weeks)
  - Language
  - Rating (4+ stars, etc.)
- **Search:** Full-text search across titles and descriptions
- **Sort by:** Popularity, Rating, Newest, Price, Alphabetical
- Course cards showing:
  - Thumbnail image
  - Title and instructor
  - Rating and review count
  - Price and enrollment count
  - Duration and level
  - Key learning outcomes

**Actions:**
- *Click course:* Navigate to course detail page
- *Dialog:* Quick preview with syllabus
- *Bookmark:* Save for later (if logged in)

---

### 3. `/courses/[slug]` - Course Detail Page
**Purpose:** Complete course information and enrollment
**Features:**
- Course overview video/image
- Instructor bio and credentials
- Course description and objectives
- What you'll learn (key takeaways)
- **Syllabus/Curriculum:**
  - Expandable chapters
  - Lesson titles and durations
  - Preview lessons (some unlocked)
- Requirements and prerequisites
- Student reviews and ratings
- FAQ section
- Related courses
- Price and payment plans
- Certificate information

**Actions:**
- *Button:* Enroll now (redirects to login if not authenticated)
- *Dialog:* Payment plan selection
- *Dialog:* Preview free lessons
- *Share:* Social media sharing

---

### 4. `/blog` - Blog/News Section
**Purpose:** Educational content and platform updates
**Features:**
- Blog post grid with featured post
- **Filters:**
  - Category (Tips, Updates, Success Stories, Tutorials)
  - Date range
  - Author
- Search posts
- Post cards showing:
  - Featured image
  - Title and excerpt
  - Author and date
  - Read time
  - Tags

**Actions:**
- *Click post:* Navigate to blog post
- *Subscribe:* Newsletter signup
- Filter by category

---

### 5. `/blog/[slug]` - Blog Post
**Purpose:** Read individual blog article
**Features:**
- Full article content (rich text, images, videos)
- Author bio and social links
- Publication date and read time
- Tags and categories
- Related posts
- Share buttons
- Comments section (optional)
- Table of contents for long posts

**Actions:**
- *Share:* Social media, copy link
- *Bookmark:* Save post
- *Comment:* Leave feedback

---

### 6. `/about` - About Page
**Purpose:** Organization information and mission
**Features:**
- Mission and vision statement
- Team members with photos and bios
- Platform history/story
- Statistics and achievements
- Values and methodology
- Contact information
- Partners and affiliations

---

### 7. `/terms` - Terms of Service
**Purpose:** Legal terms and conditions
**Features:**
- Comprehensive terms of service
- Last updated date
- Table of contents with anchor links
- Sections:
  - Account terms
  - Payment terms
  - Refund policy
  - Content usage
  - User responsibilities
  - Dispute resolution

---

### 8. `/privacy` - Privacy Policy
**Purpose:** Data protection and privacy information
**Features:**
- Privacy policy details
- GDPR compliance information
- Data collection explanation
- Cookie policy
- Data retention and deletion
- User rights
- Contact for privacy concerns

---

### 9. `/auth/login` - Login Page
**Purpose:** User authentication
**Features:**
- Email/password login form
- "Remember me" checkbox
- Social login options (Google, Facebook, GitHub)
- Error messages for invalid credentials
- Link to registration page

**Actions:**
- *Dialog:* Forgot password (email reset)
- *Button:* Login with social accounts
- *Link:* Create new account

---

### 10. `/auth/register` - Registration Page
**Purpose:** New user account creation
**Features:**
- Registration form:
  - Full name
  - Email address
  - Password (with strength indicator)
  - Role selection (Student/Instructor)
  - Terms acceptance checkbox
- Social registration options
- Email verification notice

**Actions:**
- *Submit:* Create account and send verification email
- *Button:* Register with social accounts
- *Link:* Already have account? Login

---

## 👨‍🎓 Student Dashboard (12)

### 1. `/dashboard/student` - Student Home
**Purpose:** Central hub for student activity
**Features:**
- **Enrolled Courses Widget:**
  - Cards with progress bars (% complete)
  - Continue learning button
  - Course thumbnail and title
  - Next lesson preview
- **Upcoming Events Widget:**
  - Next 5 live classes with join buttons
  - Assignment due dates (sorted by urgency)
  - Quiz deadlines
  - Calendar sync option
- **Recent Activity:**
  - Lessons completed
  - Grades received
  - Instructor feedback
  - Forum replies
- **Statistics:**
  - Total courses enrolled
  - Completion rate
  - Certificates earned
  - Total learning hours
- **Notifications:**
  - Unread messages count
  - New announcements
  - Grade notifications

**Actions:**
- *Click course:* Navigate to course player
- *Button:* Join live class
- *Dialog:* Enroll in new course
- *Button:* View all notifications

---

### 2. `/dashboard/student/courses` - Course List
**Purpose:** View and manage all enrolled courses
**Features:**
- Course cards with detailed info:
  - Progress percentage and visual bar
  - Completed lessons / Total lessons
  - Next lesson to watch
  - Course instructor
  - Certificate status
  - Last accessed date
- **Filters:**
  - Status (In Progress, Not Started, Completed)
  - Category
  - Instructor
- **Sort by:**
  - Recently accessed
  - Progress (high to low)
  - Enrollment date
  - Course name

**Actions:**
- *Click course:* Open course player
- *Button:* Continue learning (resumes last lesson)
- *Slide-over:* Course overview (syllabus, assignments, grades)
- *Dialog:* Unenroll from course (with confirmation)
- *Button:* Download course materials
- *Button:* View certificate (if completed)

---

### 3. `/dashboard/student/courses/[course_slug]` - Course Player
**Purpose:** Main learning interface for course content
**Layout:**
- **Left Sidebar (Lesson Navigation):**
  - All chapters (expandable)
  - All lessons with checkmarks (✓ completed)
  - Locked lessons (🔒 requires previous completion)
  - Lesson type icons (video, text, quiz, assignment)
  - Progress percentage at top
  - Search lessons
- **Main Content Area:**
  - Video player with controls (speed, quality, captions)
  - Text content with formatting
  - PDF viewer
  - Audio player
  - Downloadable files
  - Lesson notes section
  - Previous/Next lesson buttons
- **Right Sidebar (optional):**
  - Course notes
  - Bookmarks
  - Transcript (for videos)

**Tabs:** Lessons | Assignments | Quizzes | Live Classes | Discussion

**Tab: Lessons**
- Active lesson content
- Mark as complete button
- Take notes (saved per lesson)
- Download resources
- Ask question button

**Tab: Assignments**
- List of course assignments
- Due dates and status
- *Dialog:* View assignment details
- *Dialog:* Submit work (file upload, text editor)
- *Dialog:* View graded feedback with rubric

**Tab: Quizzes**
- Available quizzes for this course
- Time limit and attempts information
- *Dialog:* Quiz instructions and settings
- *Full-screen Dialog:* Take quiz
- *Dialog:* View results and explanations

**Tab: Live Classes**
- Scheduled live sessions for this course
- Past recordings with playback
- *Dialog:* Session details
- *Button:* Join live class
- Download session materials

**Tab: Discussion**
- Course Q&A forum
- Ask instructor/peers
- Upvote helpful answers
- Filter by unanswered, popular, recent
- *Dialog:* Create new question/topic

---

### 4. `/dashboard/student/courses/[course_slug]/lessons/[lesson_slug]` - Lesson Viewer
**Purpose:** View individual lesson content
**Features:**
- Video player with controls
- Text content display
- PDF viewer
- Audio player
- Downloadable files
- Lesson notes section
- Previous/Next lesson buttons
- Mark as complete button
- Progress tracking

**Actions:**
- *Button:* Mark lesson complete
- *Button:* Download resources
- *Button:* Take notes
- *Button:* Ask question

---

### 5. `/dashboard/student/assignments` - All Assignments
**Purpose:** View assignments across all enrolled courses
**Features:**
- Assignment list with cards showing:
  - Assignment title and course
  - Due date with countdown (X days left)
  - Status badge (Not Started, In Progress, Submitted, Graded, Late, Overdue)
  - Points possible / Points earned
  - Submission type (Essay, Project, File Upload)
- **Filters:**
  - Status (All, Pending, Submitted, Graded, Overdue)
  - Course
  - Due date range
- **Sort by:**
  - Due date (closest first)
  - Course name
  - Grade (if available)
  - Submission status
- Statistics:
  - Total assignments
  - Pending submissions
  - Average grade

**Actions:**
- *Slide-over:* Assignment details
  - Full description
  - Requirements checklist
  - Rubric/grading criteria
  - Attached files
  - Submission history
  - Peer review requirements (if applicable)
- *Dialog:* Submit assignment
  - File upload (multiple files)
  - Rich text editor for written work
  - Add comments
  - Submit or save draft
- *Dialog:* View feedback
  - Grade and points
  - Instructor comments
  - Rubric scores
  - Annotated files (if applicable)
  - Option to resubmit (if allowed)

---

### 6. `/dashboard/student/assignments/[id]` - Assignment Details
**Purpose:** View and submit individual assignment
**Features:**
- Assignment description and requirements
- Due date and status
- File upload capability
- Rich text editor for submissions
- Submission history
- Graded feedback view
- Rubric display

**Actions:**
- *Dialog:* Submit assignment
- *Dialog:* View feedback
- *Button:* Download resources
- *Button:* Resubmit (if allowed)

---

### 7. `/dashboard/student/quizzes/[id]` - Take Quiz
**Purpose:** Take quiz or exam
**Features:**
- Quiz instructions
- Question navigation
- Timer countdown (if timed)
- Flag questions for review
- Save progress
- Auto-submit on time expiration

**Actions:**
- *Button:* Submit quiz
- *Button:* Save draft
- *Button:* Flag for review

---

### 8. `/dashboard/student/quizzes/[id]/results` - Quiz Results
**Purpose:** View quiz results and feedback
**Features:**
- Total score and percentage
- Pass/Fail status
- Question-by-question breakdown
- Correct answers (if allowed)
- Explanations
- Time taken
- Attempt history

**Actions:**
- *Button:* Retake quiz (if allowed)
- *Button:* View explanations

---

### 9. `/dashboard/student/grades` - Grades
**Purpose:** View all grades and academic performance
**Features:**
- Course-wise grade breakdown
- Assignment grades
- Quiz scores
- Overall GPA/average
- Grade trends and charts
- Completed vs pending work

**Filters:**
- Course filter
- Assignment/Quiz filter
- Date range

---

### 10. `/dashboard/student/my-content` - My Content
**Purpose:** Manage student's own created content
**Features:**
- Uploaded files and documents
- Notes and annotations
- Bookmarked lessons
- Saved resources
- Content organization

**Actions:**
- *Button:* Upload content
- *Button:* Organize content
- *Button:* Share content

---

### 11. `/dashboard/student/my-progress` - My Progress
**Purpose:** Track learning progress and achievements
**Features:**
- Overall progress metrics
- Course completion percentages
- Learning streak
- Time spent learning
- Certificates earned
- Achievements and badges
- Goals and milestones

**Charts:**
- Progress over time
- Course completion trends
- Learning activity heatmap

---

### 12. `/dashboard/student/schedule` - Calendar View
**Purpose:** Unified calendar for all course activities
**Features:**
- **Calendar Views:**
  - Month view (default)
  - Week view
  - Day view
  - Agenda/List view
- **Event Types (color-coded):**
  - 🟦 Assignments due
  - 🟨 Quizzes/Exams
  - 🟩 Live classes
  - 🟪 Lessons scheduled
  - 🟧 Office hours
  - 🟥 Important deadlines
- **Filters:**
  - Event type
  - Course
  - Show/hide completed
- **Features:**
  - Today button (jump to current date)
  - Mini-calendar for quick navigation
  - Upcoming events list (next 7 days)
  - Sync with Google Calendar / iCal
  - Time zone display
  - Event reminders

**Actions:**
- *Click event:* Dialog with details
  - Event title and description
  - Time and duration
  - Course association
  - Location (for physical events)
  - Meeting link (for online events)
  - Add to personal calendar
  - Set reminder
- *Dialog:* Join live class (for live events)
- *Dialog:* Submit assignment (for due assignments)
- *Dialog:* Take quiz (for quiz deadlines)

---

---

## 👨‍🏫 Instructor Dashboard (15)

### 1. `/dashboard/instructor` - Instructor Home
**Purpose:** Instructor overview and quick actions
**Features:**
- **My Courses Overview:**
  - Course cards with stats
  - Total students per course
  - Revenue generated (if paid)
  - Completion rates
  - Recent reviews/ratings
- **Pending Tasks Widget:**
  - Submissions to grade (count)
  - Unanswered questions (count)
  - Join requests to approve
  - Upcoming live classes
- **Recent Activity:**
  - New enrollments
  - Completed courses
  - Reviews received
  - Student messages
- **Statistics Dashboard:**
  - Total students
  - Total courses
  - Average rating
  - Total revenue
  - This month trends
- **Quick Actions:**
  - Create new course
  - Schedule live class
  - Create assignment
  - View analytics

**Actions:**
- *Button:* Create new course (dialog)
- *Button:* View all submissions to grade
- *Button:* Answer student questions
- *Click course:* Navigate to course editor

---

### 2. `/dashboard/lms` - LMS Home/Overview
**Purpose:** LMS section landing page
**Features:**
- Overview of all LMS modules
- Quick access to courses, assignments, quizzes
- Recent activity in LMS
- Statistics and metrics

---

### 3. `/dashboard/lms/courses` - My Courses
**Purpose:** Manage all instructor courses
**Features:**
- **Course Cards:**
  - Course thumbnail
  - Course title and category
  - Status badge (Published, Draft, Under Review, Archived)
  - Enrollment count
  - Rating and reviews
  - Revenue (if paid course)
  - Last updated date
  - Quick action buttons (Edit, View, Analytics)
- **Filters:**
  - Status
  - Category
  - Price type
- **Sort by:**
  - Recent activity
  - Enrollment count
  - Rating
  - Revenue
  - Alphabetical
- **Statistics Summary:**
  - Total courses
  - Total students across all courses
  - Average rating
  - Total revenue

**Actions:**
- *Dialog:* Create new course
  - Course title
  - Category selection
  - Level selection
  - Description
  - Create as draft
- *Slide-over:* Quick course settings
  - Title, description
  - Thumbnail upload
  - Pricing
  - Publish/Unpublish toggle
- *Click course:* Navigate to full course editor
- *Button:* Duplicate course
- *Button:* Archive course

---

### 4. `/dashboard/lms/courses/[id]` - Course Overview & Analytics
**Purpose:** Course dashboard with metrics and quick actions
**Features:**
- **Key Metrics Cards:**
  - Total enrollments
  - Active students
  - Revenue generated
  - Completion rate
  - Average rating
- **Charts and Analytics:**
  - Enrollments over time
  - Revenue trends
  - Student engagement
  - Recent activity
- **Quick Actions:**
  - View course content
  - Manage students
  - Edit course settings
  - View analytics

**Actions:**
- *Button:* Navigate to content editor
- *Button:* View detailed analytics
- *Button:* Manage students

---

### 5. `/dashboard/lms/courses/[id]/content` - Course Content Editor
**Purpose:** Manage course structure and lessons
**Features:**
- **Chapter/Section Management:**
  - List of all chapters
  - Add new chapter
  - Reorder chapters (drag-and-drop)
  - Edit chapter title and description
  - Delete chapter
- **Lessons within Chapters:**
  - Nested list of lessons per chapter
  - Lesson type icons
  - Reorder lessons (drag-and-drop)
  - Move lessons between chapters
  - Preview lesson
  - Lesson settings
- **Content Organization:**
  - Expandable tree view
  - Total lessons count
  - Total duration calculation
  - Content completion percentage

**Actions:**
- *Dialog:* Add new chapter
- *Dialog:* Add new lesson
- *Button:* Bulk import lessons
- *Button:* Preview course

---

### 6. `/dashboard/lms/courses/[id]/content/section/[section]/lesson` - Lesson Editor
**Purpose:** Create and edit individual lessons
**Features:**
- **Lesson Types:**
  - Video lesson (upload or embed)
  - Text lesson (rich text editor)
  - Quiz lesson
  - Assignment lesson
  - File/Resource
- **Lesson Settings:**
  - Title and description
  - Duration
  - Free preview toggle
  - Prerequisites
  - Downloadable resources
- **Content Editor:**
  - Rich text editing
  - Media upload
  - Video embedding
  - Code blocks

**Actions:**
- *Button:* Save lesson
- *Button:* Preview lesson
- *Button:* Publish/Unpublish

---

### 7. `/dashboard/lms/courses/[id]/customers` - Course Students
**Purpose:** Manage enrolled students
**Features:**
- **Enrolled Students List:**
  - Student name and photo
  - Enrollment date
  - Progress percentage
  - Last activity
  - Completion status
  - Grade/Score (if applicable)
  - Email and contact
- **Search and Filter:**
  - Search by name/email
  - Filter by progress
  - Filter by status (Active, Completed, Inactive)
  - Filter by enrollment date
- **Bulk Actions:**
  - Send message to selected
  - Export student list (CSV)
  - Unenroll selected
- **Statistics:**
  - Total enrollments
  - Active students
  - Completion rate
  - Average progress

**Actions:**
- *Slide-over:* Student details
- *Button:* Message student(s)
- *Button:* Export student data

---

### 8. `/dashboard/lms/courses/[id]/manage` - Course Settings
**Purpose:** Manage course details and settings
**Features:**
- **Course Information:**
  - Course title
  - Description (rich text editor)
  - Course thumbnail
  - Category and tags
  - Language
  - Skill level
  - Pricing and payment plans
- **Publishing Settings:**
  - Publish/Unpublish toggle
  - Visibility settings
  - Enrollment settings
- **Advanced Settings:**
  - Certificate settings
  - Forum/Q&A enabled
  - Downloadable resources
  - Prerequisites

**Actions:**
- *Button:* Save settings
- *Button:* Publish course
- *Dialog:* Upload thumbnail

---

### 9. `/dashboard/lms/cohorts` - Cohort Management
**Purpose:** Manage time-bound course groups
**Features:**
- **Cohort Cards:**
  - Cohort name and linked course
  - Duration (start date - end date)
  - Status (Upcoming, Live, Completed, Cancelled)
  - Instructor assigned
  - Current enrollment / Max capacity
  - Completion rate (if ended)
  - Invite code (if private)
- **Filters:**
  - Status
  - Course
  - Date range
- **Sort by:**
  - Start date
  - Enrollment count
  - Status
- **Statistics:**
  - Total cohorts
  - Active cohorts
  - Total students in cohorts
  - Average completion rate

**Actions:**
- *Dialog:* Create new cohort
  - Cohort title
  - Select course
  - Invite code
  - Status
  - Description
- *Click cohort:* Navigate to cohort details
- *Button:* Edit cohort
- *Button:* Delete cohort

---

### 10. `/dashboard/lms/cohorts/[id]` - Cohort Details
**Purpose:** Manage individual cohort
**Features:**
- **Cohort Information:**
  - Title and description
  - Course linked
  - Status
  - Begin and end dates
  - Duration in weeks
  - Max capacity
  - Invite code
- **Edit Form:**
  - Edit all cohort fields inline
  - Course selection (searchable)
  - Status dropdown
  - Date pickers
  - Capacity settings

**Actions:**
- *Button:* Save changes
- *Button:* Back to cohorts list
- *Button:* View course

---

### 11. `/dashboard/lms/assignments` - Assignment List
**Purpose:** View all assignments across courses
**Features:**
- **Assignment List:**
  - Assignment title and course
  - Type (Essay, Project, etc.)
  - Due date
  - Submissions count
  - Status (Published, Draft)
- **Filters:**
  - Course
  - Status
  - Date range
- **Quick Stats:**
  - Total assignments
  - Pending submissions to grade

**Actions:**
- *Button:* Create assignment
- *Click assignment:* Navigate to assignment details

---

### 12. `/dashboard/lms/assignments/[id]` - Assignment Editor
**Purpose:** Create and manage assignment with tabs
**Tabs:** Settings | Grading | Submissions

**Tab: Settings**
- **Assignment Details:**
  - Title
  - Description (rich text)
  - Course selection
  - Type (Essay, Project, File Upload)
  - Total points
  - Due date
  - Late submission settings
- **Submission Settings:**
  - Allowed file types
  - Max file size
  - Text submission enabled
  - Max attempts
- **Rubric:**
  - Add rubric criteria
  - Points per criterion

**Actions:**
- *Button:* Save assignment
- *Button:* Publish assignment

**Tab: Grading**
- **Grading Configuration:**
  - Grading rubric
  - Auto-grading settings
  - Passing score
  - Feedback templates

**Tab: Submissions**
- **Submission List:**
  - Student name
  - Submission date
  - Status (Submitted, Graded, Late)
  - Grade
- **Filters:**
  - Status filter
  - Sort by date/grade
- **Actions:**
  - *Click submission:* Grade individual submission
  - *Dialog:* Grade submission with rubric
  - *Button:* Export grades

---

### 13. `/dashboard/lms/quizzes` - Quiz List
**Purpose:** View all quizzes across courses
**Features:**
- **Quiz List:**
  - Quiz title and course
  - Questions count
  - Time limit
  - Attempts allowed
  - Average score
  - Status (Published, Draft)
- **Filters:**
  - Course
  - Status
- **Quick Stats:**
  - Total quizzes
  - Average completion rate

**Actions:**
- *Button:* Create quiz
- *Click quiz:* Navigate to quiz editor

---

### 14. `/dashboard/lms/quizzes/[id]` - Quiz Editor
**Purpose:** Create and manage quiz with tabs
**Tabs:** Settings | Questions | Submissions

**Tab: Settings**
- **Quiz Details:**
  - Title and description
  - Course selection
  - Time limit
  - Max attempts
  - Passing score
  - Shuffle questions
  - Show results settings

**Tab: Questions**
- **Question Bank:**
  - List of questions
  - Question types (Multiple Choice, True/False, Short Answer, Essay)
  - Add/edit/delete questions
  - Reorder questions
  - Points per question
- **Question Editor:**
  - Question text (rich text)
  - Answer options
  - Correct answer(s)
  - Explanation
  - Points value

**Tab: Submissions**
- **Attempt List:**
  - Student name
  - Attempt number
  - Score and percentage
  - Time taken
  - Status
- **Actions:**
  - *Click attempt:* View detailed results
  - *Dialog:* Grade essay questions
  - *Button:* Export results

---

### 15. `/dashboard/lms/live-classes` - Live Classes
**Purpose:** Manage virtual sessions
**Features:**
- **View Modes:**
  - Table view (default)
  - Calendar/Agenda view
- **Live Class List (Table View):**
  - Session title
  - Type (Lecture, Workshop, Q&A, Discussion, Presentation)
  - Course/Cohort association
  - Status (Scheduled, Live, Ended, Cancelled)
  - Instructor name
  - Start time
  - Duration (calculated from start/end)
  - Platform (auto-detected: Zoom, Google Meet, MS Teams)
  - Action buttons (Start session, View recording)
- **Calendar View (Agenda Style):**
  - Chronologically sorted sessions
  - Full session cards with all details
  - Quick start/edit buttons
  - Visual badges for status and type
  - Platform and duration info
- **Filters:**
  - Search by title
  - Status filter
  - Type filter
- **Statistics Cards:**
  - Total Sessions
  - Scheduled sessions
  - Live now count
  - Ended sessions

**Actions:**
- *Dialog:* Schedule new live class
- *Button:* Start session (opens meeting URL)
- *Button:* View recording (if available)
- *Button:* Edit/Delete session

---

### 16. `/dashboard/lms/schedule` - Master Schedule
**Purpose:** Unified instructor calendar
**Features:**
- **Calendar Views:**
  - Month view
  - Week view
  - Day view
  - Agenda view
- **Event Types:**
  - Live classes
  - Assignment due dates
  - Quiz deadlines
  - Course milestones
- **Features:**
  - Multi-course view
  - Time zone display
  - Drag-and-drop reschedule
  - Color coding by course

**Actions:**
- *Dialog:* Create event
- *Click event:* Event details
- *Button:* Sync to calendar

---

### 17. `/dashboard/lms/reviews` - Course Reviews
**Purpose:** Manage course reviews and ratings
**Features:**
- **Review List:**
  - Reviewer name
  - Course reviewed
  - Rating (stars)
  - Review text
  - Review date
  - Status (Approved, Pending, Reported)
- **Filters:**
  - Course
  - Rating
  - Status

**Actions:**
- *Dialog:* Respond to review
- *Button:* Approve/reject review

---

### 18. `/dashboard/lms/themes` - Theme Management
**Purpose:** Manage course themes and customization
**Features:**
- **Theme List:**
  - Theme name
  - Associated courses
  - Last modified
  - Status (Active, Draft)

**Actions:**
- *Button:* Create new theme
- *Click theme:* Navigate to theme editor

---

### 19. `/dashboard/lms/themes/[id]` - Theme Editor
**Purpose:** Customize course appearance with tabs
**Tabs:** Settings | Code

**Tab: Settings**
- **Theme Configuration:**
  - Theme name
  - Colors
  - Typography
  - Layout options
  - Custom CSS

**Tab: Code**
- **Code Editor:**
  - CSS code editor
  - JavaScript code editor (if applicable)
  - Preview panel

**Actions:**
- *Button:* Save theme
- *Button:* Apply to courses
- *Button:* Preview

---

### 20. `/dashboard/lms/themes/new` - New Theme Creator
**Purpose:** Create new theme from scratch
**Features:**
- Theme creation wizard
- Template selection
- Customization options

---

## 👨‍💼 Admin Dashboard (9)

### 1. `/dashboard/admin` - Admin Home
**Purpose:** Platform-wide overview and system status
**Features:**
- **Key Metrics:**
  - Total Users
  - Total Courses
  - Total Revenue
  - Active Enrollments
  - Platform Health Score
- **Trend Charts:**
  - User growth
  - Revenue growth
  - Course enrollments
  - Active users
- **Recent Activity:**
  - New user registrations
  - Course submissions for review
  - Support tickets
  - Payment transactions
- **Quick Actions:**
  - Manage users
  - Review courses
  - View reports
  - System settings

**Actions:**
- *Button:* View detailed reports
- *Button:* Manage users
- *Button:* Review pending courses

---

### 2. `/dashboard/admin/users` - User Management
**Purpose:** Manage all platform users
**Features:**
- **User List:**
  - Name and email
  - User type (Student, Instructor, Admin)
  - Status (Active, Restricted, Banned)
  - Registration date
  - Last login
  - Courses enrolled/teaching
- **Search and Filter:**
  - Search by name/email
  - Filter by role
  - Filter by status
  - Date range
- **Bulk Actions:**
  - Export users
  - Send email
  - Activate/Deactivate
  - Assign role

**Actions:**
- *Dialog:* Invite new user
- *Slide-over:* User details with tabs
- *Button:* Edit user
- *Button:* Delete user

---

### 3. `/dashboard/admin/users/[id]` - User Details
**Purpose:** View and manage individual user
**Features:**
- **User Information:**
  - Profile details
  - Contact information
  - Account status
  - Roles and permissions
- **Activity History:**
  - Login history
  - Courses accessed
  - Purchases made
- **Enrollments:**
  - Enrolled courses (for students)
  - Teaching courses (for instructors)

**Actions:**
- *Button:* Edit user
- *Button:* Change role
- *Button:* Ban/activate user
- *Button:* Impersonate user

---

### 4. `/dashboard/admin/settings` - Platform Settings
**Purpose:** Configure platform-wide settings
**Tabs:** (Multiple setting categories)

**Actions:**
- *Button:* Save settings

---

### 5. `/dashboard/admin/settings/website-settings` - Website Settings
**Purpose:** Configure website appearance and content
**Features:**
- **General Settings:**
  - Site name
  - Tagline
  - Logo upload
  - Favicon
- **Banner Settings:**
  - Homepage banner
  - Banner text
  - Banner image
- **Main Page Settings:**
  - Featured content
  - Layout options
  - Custom sections

**Actions:**
- *Button:* Save settings
- *Button:* Preview changes

---

### 6. `/dashboard/admin/settings/schools` - Multi-School Management
**Purpose:** Manage multiple schools/tenants
**Features:**
- **School List:**
  - School name
  - Domain
  - Status
  - Created date
- **Filters:**
  - Status
  - Date range

**Actions:**
- *Dialog:* Create new school
- *Button:* Edit school
- *Button:* Delete school

---

### 7. `/dashboard/admin/studio` - Admin Studio
**Purpose:** Advanced admin tools and diagnostics
**Features:**
- Developer tools
- System diagnostics
- Quick access to DB and Redis

---

### 8. `/dashboard/admin/studio/db` - Database Explorer
**Purpose:** View and manage database
**Features:**
- Database tables
- Query interface
- Data viewer
- Export/import tools

---

### 9. `/dashboard/admin/studio/redis` - Redis Explorer
**Purpose:** View and manage Redis cache
**Features:**
- Redis keys viewer
- Cache management
- Performance metrics

---

## 🔔 Other Routes (3)

### 1. `/dashboard` - Dashboard Home (Redirect)
**Purpose:** Main dashboard landing (redirects based on role)
**Features:**
- Auto-redirects to appropriate dashboard:
  - Student → `/dashboard/student`
  - Instructor → `/dashboard/instructor`
  - Admin → `/dashboard/admin`

---

### 2. `/dashboard/profile` - User Profile
**Purpose:** Manage user profile and settings
**Features:**
- **Profile Information:**
  - Profile photo
  - Display name
  - Bio
  - Contact information
- **Account Settings:**
  - Email
  - Password
  - Two-factor authentication
- **Privacy Settings:**
  - Profile visibility
  - Data preferences

**Actions:**
- *Button:* Save changes
- *Dialog:* Upload profile photo
- *Dialog:* Change password

---

### 3. `/dashboard/notifications` - Notifications
**Purpose:** View all notifications
**Features:**
- **Notification List:**
  - Notification message
  - Type (Info, Warning, Success, Error)
  - Timestamp
  - Read/unread status
- **Filters:**
  - All/Unread
  - Type filter
  - Date range
- **Categories:**
  - Course updates
  - Assignments
  - Grades
  - Messages
  - System notifications

**Actions:**
- *Button:* Mark all as read
- *Button:* Clear notifications
- *Click notification:* Navigate to related content

---

## 📋 Complete Route List

### Public (10 routes)
1. `/` - Landing
2. `/courses` - Catalog with filters
3. `/courses/[slug]` - Course detail
4. `/blog` - Blog list with filters
5. `/blog/[slug]` - Post
6. `/about` - About page
7. `/terms` - Terms of service
8. `/privacy` - Privacy policy
9. `/auth/login` - Login
10. `/auth/register` - Register

### Student (12 routes)
1. `/dashboard/student` - Student home
2. `/dashboard/student/courses` - Course list
3. `/dashboard/student/courses/[course_slug]` - Course player
4. `/dashboard/student/courses/[course_slug]/lessons/[lesson_slug]` - Lesson viewer
5. `/dashboard/student/assignments` - All assignments
6. `/dashboard/student/assignments/[id]` - Assignment details
7. `/dashboard/student/quizzes/[id]` - Take quiz
8. `/dashboard/student/quizzes/[id]/results` - Quiz results
9. `/dashboard/student/grades` - Grades
10. `/dashboard/student/my-content` - My content
11. `/dashboard/student/my-progress` - My progress
12. `/dashboard/student/schedule` - Schedule

### Instructor (20 routes)
1. `/dashboard/instructor` - Instructor home
2. `/dashboard/lms` - LMS overview
3. `/dashboard/lms/courses` - My courses
4. `/dashboard/lms/courses/[id]` - Course overview
5. `/dashboard/lms/courses/[id]/content` - Content editor
6. `/dashboard/lms/courses/[id]/content/section/[section]/lesson` - Lesson editor
7. `/dashboard/lms/courses/[id]/customers` - Course students
8. `/dashboard/lms/courses/[id]/manage` - Course settings
9. `/dashboard/lms/cohorts` - Cohort list
10. `/dashboard/lms/cohorts/[id]` - Cohort details
11. `/dashboard/lms/assignments` - Assignment list
12. `/dashboard/lms/assignments/[id]` - Assignment editor
13. `/dashboard/lms/quizzes` - Quiz list
14. `/dashboard/lms/quizzes/[id]` - Quiz editor
15. `/dashboard/lms/live-classes` - Live classes
16. `/dashboard/lms/schedule` - Master schedule
17. `/dashboard/lms/reviews` - Course reviews
18. `/dashboard/lms/themes` - Theme list
19. `/dashboard/lms/themes/[id]` - Theme editor
20. `/dashboard/lms/themes/new` - New theme creator

### Admin (9 routes)
1. `/dashboard/admin` - Admin home
2. `/dashboard/admin/users` - User management
3. `/dashboard/admin/users/[id]` - User details
4. `/dashboard/admin/settings` - Platform settings
5. `/dashboard/admin/settings/website-settings` - Website settings
6. `/dashboard/admin/settings/schools` - Multi-school management
7. `/dashboard/admin/studio` - Admin studio
8. `/dashboard/admin/studio/db` - Database explorer
9. `/dashboard/admin/studio/redis` - Redis explorer

### Other (3 routes)
1. `/dashboard` - Dashboard home (redirect)
2. `/dashboard/profile` - User profile
3. `/dashboard/notifications` - Notifications

**Total Routes: 54** (10 public + 12 student + 20 instructor + 9 admin + 3 other)

---

## 🎯 UI Pattern Reference

| Pattern | When to Use | Examples |
|---------|-------------|----------|
| **Dialog** | Create/edit forms, confirmations, short workflows | Create course, Create cohort, Submit assignment, Grade submission, Quick settings |
| **Slide-over** | View details, related lists, secondary information | User details, Student details, Invoice details |
| **Tabs** | Related content sections, different views of same data | Assignment editor (Settings/Grading/Submissions), Quiz editor, Course settings, Theme editor |
| **Split View** | List + active item, master-detail pattern | Not heavily used in current implementation |
| **Inline Edit** | Quick field updates, simple changes | Cohort details page, Course settings |
| **Full-screen Dialog** | Immersive tasks, focus-required activities | Take quiz, Video player |
| **Data Table** | List views with sorting/filtering | Cohort list, User list, Course list |

---

## ✅ Key Benefits

### User Experience
- **Optimized navigation** - Dialogs reduce page transitions
- **Instant feedback** - Dialogs appear instantly without page reloads
- **Preserved state** - Form data and scroll position maintained
- **Intuitive workflows** - Actions appear where users expect them
- **Mobile-friendly** - Dialogs become full-screen on mobile naturally

### Performance
- **Faster interactions** - No full page reloads for common actions
- **Better caching** - Loaded data reused across overlays
- **Reduced bandwidth** - Less data transferred per interaction
- **Improved perceived performance** - Instant visual feedback

### Development
- **Reusable components** - Dialog and form components shared across features
- **Clean routing** - Hierarchical route structure
- **Easier testing** - Test components independently
- **Better maintainability** - Changes localized to components
- **Consistent patterns** - Tab-based editors for complex forms

### Mobile
- **Native-like experience** - Dialogs feel like mobile app modals
- **Better touch interactions** - Optimized for touch targets
- **Faster navigation** - No page transition delays
- **Responsive design** - Adapts naturally to screen size

---

## 🚀 Key Metrics

- **Total Routes:** 54 (well-organized and scalable)
- **Dialogs Used:** Extensively for create/edit operations
- **Tabs Used:** For complex editors (assignments, quizzes, courses, themes)
- **Data Tables:** For all list views with filtering and sorting
- **Mobile Optimized:** 100%
- **Reusable Components:** High reusability across features

---

## 📝 Implementation Notes

### Current Architecture
1. **Dialogs for CRUD:** Create and edit operations use `FormDialog` from components library
2. **Tabs for Complex Forms:** Multi-section forms use tab navigation (assignments, quizzes, themes)
3. **Data Tables:** All list pages use `DataTable` component with built-in filtering/sorting
4. **Context Providers:** Complex pages use React Context for state management (cohort-context, assignment-context, etc.)
5. **tRPC for API:** All API calls use tRPC with React Query for caching
6. **Form Validation:** Zod schemas for form validation
7. **Optimistic Updates:** tRPC query invalidation for instant UI updates

### Dialog Usage Pattern
```typescript
// Common pattern across the application
const createDialogControl = useDialogControl();

<CreateDialog 
  control={createDialogControl} 
  onSuccess={() => refetchList()} 
/>
```

### Tab Pattern
```typescript
// Complex editors use tabs
**Tabs:** Settings | Grading | Submissions

**Tab: Settings** - Basic configuration
**Tab: Grading** - Grading-specific settings
**Tab: Submissions** - View and manage submissions
```

### Data Table Pattern
```typescript
// List views with filtering
- Search input
- Status filter dropdown
- DataTable with sorting
- Actions column with dropdown menu
```

---

**Note:** The current implementation emphasizes:
- **Simplicity:** Dialogs for simple operations
- **Organization:** Tabs for complex multi-section forms
- **Consistency:** Reusable patterns across all features
- **Performance:** tRPC + React Query for optimal data fetching
- **User Experience:** Instant feedback and minimal page transitions
