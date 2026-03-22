import { eq } from 'drizzle-orm';
import { writingSamples } from './db/schema';
import { db } from './db';

export const WRITING_SAMPLES: {
  id: number;
  title: string;
  content: string;
  grammarlyScore: number;
}[] = [
  {
    id: 1,
    title: 'The Impact of Remote Work on Team Collaboration',
    content: `Remote work has became one of the most significant changes in how companys operate in recent years. While many organizations was forced to adopt it during the pandemic, the long-term effects on team collaboration is still being debated by researchers and business leaders alike. This essay examines the ways that remote work effects team dynamics, communication patterns, and overall productivity.

One of the biggest challenge that remote teams face are the lack of spontaneous interactions. In a traditional office, employees might run into each other in the hallway or break room, leading to informal conversations that often sparks new ideas. These chance encounters, which researchers calls "watercooler moments," is nearly impossible to replicate in a virtual environment. Many teams has tried to create digital equivalents, such as virtual coffee chats or random pairing programs, but these solutions feels forced and artificial to most participants.

Communication in remote settings also tend to be more asynchronous, which have both advantages and disadvantages. On the positive side, team members can respond to messages at their own pace, allowing for more thoughtful and considered responses. However, this asynchronicity often lead to misunderstandings because written communication lack the tonal cues and body language that helps people interpret meaning in face-to-face conversations. A message that was intended as a lighthearted joke might be perceived as criticism, creating unnecessary tension between collegues.

The technology tools available for remote collaboration has improved dramatically, but they also introduces new problems. Video conferencing fatigue, often refered to as "Zoom fatigue," has become a widespread phenomenon that effect workers across industries. Studies shows that constant video calls is more mentally exhausting than in-person meetings because our brains has to work harder to process non-verbal cues through a screen. Additionally, the pressure to appear engaged and professional on camera add an extra layer of stress that don't exist in traditional office settings.

Despite these challenges, remote work also offer unique opportunities for improving collaboration. Teams that span multiple time zones can achive a "follow the sun" workflow, where work is handed off between team members in different locations, effectively extending the productive hours of the team. This approach require careful coordination and clear documentation practices, but when executed well, it can significantly accelerate project timelines and improve the quality of deliverables that teams produces together.`,
    grammarlyScore: 54,
  },
  {
    id: 2,
    title: 'Social Media and Mental Health in Adolescents',
    content: `The relationship between social media usage and adolescent mental health have attracted considerable attention from psychologists, educators, and parents over the past decade. As smartphones has become ubiquitous among teenagers, concerns about the psychological impact of platforms like Instagram, TikTok, and Snapchat has grown substantially. This essay explore the current evidence regarding how social media effects the mental wellbeing of young people and what steps could be taken to mitigate potential harms.

Research consistently show that heavy social media use among adolescents are correlated with higher rates of anxiety and depression. A study conducted by the Royal Society for Public Health in the United Kingdom founded that Instagram was rated as the most detrimental platform for young people's mental health, primarily due to its emphasis on curated images that promote unrealistic beauty standards. Teenagers who spend more then three hours per day on social media platforms is significantly more likely to report symptoms of depression compared to those who use these platforms less frequently.

The phenomenon of cyberbullying represent another serious concern associated with social media use among young people. Unlike traditional bullying, which is generally limited to school hours and physical spaces, cyberbullying can occur at any time and follows victims into their homes. The anonymity that some platforms provides can embolden bullies to say things they would never say face-to-face, and the permanence of digital content means that hurtful messages and images can be shared and reshared indefinitely. Victims of cyberbullying often experiences feelings of helplessness because they cannot escape the harassment, even when they is physically away from they're aggressors.

However, it would be overly simplistic to characterize social media as purely harmful for adolescents. Many young people uses these platforms to find community and support, particularly those who belongs to marginalized groups or who lives in isolated areas. LGBTQ+ teenagers, for example, often credit social media with helping them connect with others who share their experiences and providing access to resources that is not available in their immediate enviroment. For these individuals, social media can serve as a crucial lifeline that reduce feelings of isolation and improves overall wellbeing.

Moving forward, a balanced approach that acknowledge both the risks and benefits of social media is essential. Schools should incorporate digital literacy programs that teaches students how to navigate social media in healthy ways, including recognizing when their usage are becoming problematic. Parents needs to maintain open dialogues with their children about online experiences rather than simply restricting access, which often backfires and damages trust. Technology companies also bears responsibility for designing platforms that prioritize user wellbeing over engagement metrics that rewards addictive behavior patterns.`,
    grammarlyScore: 64,
  },
  {
    id: 3,
    title: 'Sustainable Urban Transportation Solutions',
    content: `Cities around the world is grappling with the challenge of creating transportation systems that is both efficient and environmentally sustainable. As urban populations continues to grow, the traditional reliance on private automobiles have proven to be unsustainable, contributing to traffic congestion, air pollution, and greenhouse gas emissions. This essay examines several promising approaches to sustainable urban transportation and discusses the barriers that must be overcame for widespread adoption.

Public transit remains the backbone of sustainable urban transportation, but many existing systems requires significant modernization. Cities like Tokyo and Singapore has demonstrated that well-designed public transit networks can handle enormous passenger volumes while maintaining reliability and comfort. In contrast, many American cities suffers from decades of underinvestment in public transportation, resulting in systems that is slow, infrequent, and inconvenient compared to driving. Increasing ridership on public transit require not only improving service quality but also addressing the "last mile" problem — the gap between transit stops and passengers' final destinations that often make public transit impractical for many trips.

Cycling infrastructure represents another critical component of sustainable urban transportation that many cities has began to invest in heavily. Cities such as Copenhagen and Amsterdam, where cycling accounts for a significant portion of daily trips, demonstrates that when safe and convenient infrastructure is provided, people will choose bikes over cars for short to medium distance trips. Protected bike lanes, which physically separates cyclists from motor vehicle traffic, has been shown to dramatically increase cycling rates and reduce accidents. However, implementing cycling infrastructure in cities that was designed primarily for cars can be politically contentious, as it often requires reallocating road space or parking areas.

Electric vehicles, including both private cars and shared mobility options, offers a way to reduce transportation emissions without requiring fundamental changes to urban form. The rapid decline in battery costs have made electric vehicles increasingly competitive with conventional vehicles, and many governments is offering incentives to accelerate adoption. However, critics argue that electric vehicles alone cannot solve urban transportation challenges because they does not address congestion or the inefficient use of urban space that car-centric planning creates. A single-occupancy electric vehicle still takes up the same amount of road space as a gasoline-powered car and still require the same amount of parking infrastructure.

Emerging technologies such as autonomous vehicles and mobility-as-a-service platforms have the potential to further transform urban transportation, though their long-term impacts remains uncertain. Some researchers predicts that autonomous vehicles could reduce the need for private car ownership by making shared rides more convenient and affordable, while others warns that they could actually increase vehicle miles traveled by making driving so easy that people choose it over public transit and active transportation modes. The most promising path forward likely involves integrating multiple sustainable transportation modes into seamless, user-friendly systems that makes it easy for residents to get around without relying on private cars.`,
    grammarlyScore: 75,
  },
];

/**
 * Seeds the writing_samples table with placeholder data.
 * Idempotent — checks for existing rows before inserting.
 */
export async function seedWritingSamples() {
  for (const sample of WRITING_SAMPLES) {
    // Check if sample already exists
    const existing = await db
      .select({ id: writingSamples.id })
      .from(writingSamples)
      .where(eq(writingSamples.id, sample.id));
    if (existing.length > 0) continue;

    await db
      .insert(writingSamples)
      .values({
        id: sample.id,
        title: sample.title,
        content: sample.content,
        grammarlyScore: sample.grammarlyScore,
      });
  }
}
