using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(LearniVerseNew.Startup))]
namespace LearniVerseNew
{
    public partial class Startup
    {
        
        public void Configuration(IAppBuilder app)
        {

            ConfigureAuth(app);
        }
    }
}
